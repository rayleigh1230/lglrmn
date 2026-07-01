# Hook 工作复盘 + NXZ 解密突破口（2026-07-01）

> 作者：AI 辅助分析（接手 deepseek 的工作摊子）
> 性质：对前辈逆向工作的系统性复盘 + 重大新发现
> 关联：HANDOVER.md（前辈的工作记录）

---

## 〇、TL;DR —— 一句话结论

**前辈 deepseek 的 Hook 路线（v1→v7）方向性错误：他一直试图在内存里拦截"解压后数据"，但：(1) NPK 解包根本不需要 Hook（索引明文可读）；(2) NXZ 的解密函数是 `nxio3.npyd.dll` 的【导出函数】，甚至有 Python 绑定，可以直接调用而无需 Hook；(3) 加密用的是 RSA + 对称加密（SIMPLE/RC4/AES），密钥需从运行时获取。正确的下一步是"运行时 DLL 注入 + 调用导出函数"，不是"内存偏移 Hook"。**

---

## 一、前辈工作复盘：v1→v7 为什么全失败

### 1.1 迭代轨迹重建（从 DLL 字符串反推）

| 版本 | 策略 | 字符串证据 | 失败原因 |
|---|---|---|---|
| **v1** | 离线 zstd 解压（带字典） | `ZSTD_decompress_usingDict`、`ZSTD_createDDict`、`\zstd_dict_` | **NXZ 不是纯 zstd**，是"压缩+加密"，zstd 解不开 |
| v2-v6 | 过渡版本（推测修正字典/算法） | — | 同上根因 |
| **v7** | 运行时 Hook `nxio3.npyd.dll+0x36aa0` | `nxio3.npyd.dll base:`、`Hook fn:`、`\nxz_traced_compressed.bin` | **Hook 点错**：dump 的是 `compressed`（压缩/加密前），且偏移可能随版本失效；输出文件名暴露他拦截的位置在解密**之前** |

### 1.2 v7 的具体设计（从字符串重建）

```
DllMain → hook_thread:
  等待 nxio3.npyd.dll 加载（超时30s）
  base = GetModuleHandle("nxio3.npyd.dll")
  hook 目标 = base + 0x36aa0
  安装 inline hook（VirtualProtect 改页属性）
  nxz_hook_stub:
    检测 NXZ 魔数
    打印 RCX/RDX/R8/R9（4个参数）
    dump 到 nxz_traced_compressed.bin
```

**致命问题**：`nxz_traced_compressed.bin` 这个文件名说明他以为自己拦截的是"即将被解压的压缩数据"，但实际上：
- 如果 hook 点在 `DecryptData` **之前** → 拿到的是密文（仍是加密的）
- 如果 hook 点在 `DecryptData` **之后** → 应该叫 `decompressed`/`plain`
- 所有 `%TEMP%\nxz_*` 输出目录都是 0 字节 → hook 根本没被触发，或触发后崩溃

### 1.3 根本性失误

前辈的整个思路是**"找解压函数 → Hook 它 → dump 明文"**。但他：

1. **从未分析 `nxio3.npyd.dll` 的导出表** —— 否则他会立刻看到 `DecryptData`、`DecryptDataWithCompress` 这些**名字明晃晃的导出函数**
2. **从未分析 `nxio3.npyd.dll` 的内嵌字符串** —— 否则他会看到完整的算法说明（ENC_SIMPLE/RC4/AES + 压缩类型）
3. **靠猜偏移 `0x36aa0`** —— 这个偏移没有来源说明，可能是随机试的或从某处抄的，游戏版本更新后大概率失效
4. **把 NXZ 当纯压缩格式** —— v1 用 zstd、v7 文件名写 compressed，始终没意识到有加密层
5. **没查社区现成工具** —— zhouhang95/neox_tools、ZhangFengze/NeoXResearch 等都有相关研究

---

## 二、★ 重大新发现：NXZ 解密的完整白盒真相

### 2.1 NXZ 文件格式（实测确认）

```
偏移 0-7:   4E 58 5A 00 47 38 36 00   "NXZ\0G86\0"  (魔数 + 版变体)
偏移 8-11:  04 00 00 00               = 4 (固定标志，15948个文件100%相同，非大小)
偏移 12-15: 00 00 00 00               = 0 (保留)
偏移 16-19: XX XX XX XX               = 明文大小(解密解压后的原始.py大小)
偏移 20+:   payload                   = encrypt(compress(明文Python))
```

**验证证据**：
- 15948 个 NXZ 文件，magic 全部 = `NXZ\0G86\0`
- 偏移8 全部=4，偏移12 全部=0（排除"大小字段"假说）
- 偏移16 的值与文件用途吻合（`__init__.py` ≈112B，大配置表≈23MB）
- 大文件(4.5MB)熵=8.00（满熵=加密），f16=23M（明文）→ 压缩比5:1 → "先压缩再加密"
- payload 无 zstd 魔数(28B52FFD)、无 zlib 魔数(789c) → 必须先解密

### 2.2 解密函数是【导出函数】（核心突破）

`nxio3.npyd.dll` 导出了**完整命名的解密 API**（C++ name-mangled，但语义清晰）：

```cpp
class PyNxioImporter {
    // 解密
    string DecryptData(const char* data, size_t len);
    string DecryptDataWithCompress(const char* data, size_t len, NeoXCompressType);
    
    // Python 绑定版（返回 PyObject*）
    PyObject* DecryptDataPy(Bytes* data);
    PyObject* DecryptDataWithCompressPy(Bytes* data, int compress_type);
    
    // ★ 加密（可用于反推算法！）
    PyObject* EncryptDataPy(Bytes* data);
    PyObject* EncryptDataWithCompressPy(Bytes* data, int compress_type);
    
    // ★ 密钥设置
    void SetPrivateKey(string key);
    void SetPublicKey(string key);
    
    // 工厂函数（创建实例，无需 new）
    static PyNxioImporter* InitPythonImporter(const char* prefix);
};
```

### 2.3 加密/压缩算法全表（从 DLL 内嵌 docstring 提取）

**加密类型 `NeoXEncryptType`：**
```
ENC_SIMPLE = 1  // Simple Encryption: 用32bit key, 最多混淆前128字节
ENC_RC4    = 2  // RC4 流加密
ENC_AES    = 3  // AES
```

**压缩类型 `NeoXCompressType`：**
```
0: no_compress
1: zlib          (DECOMPRESS_TYPE_ZLIB)
2: lz4_hc        (DECOMPRESS_TYPE_LZ4)
3: lz4_fast
4: zstd          (DECOMPRESS_TYPE_ZSTD)
```

**RSA 的角色**：DLL 调用 OpenSSL（`libcrypto-1_1-x64.dll`）的 `RSA_public_decrypt`、`PEM_read_bio_RSAPublicKey`。RSA 1024位只能加密117字节，**不可能加密整个 NXZ**。RSA 极可能用于：
- 加密/封装对称密钥（key wrapping）
- 或校验文件签名

### 2.4 内嵌的 RSA 公钥（已提取）

`nxio3.npyd.dll` 偏移 111808 处硬编码了 PKCS#1 RSA 公钥（1024位）：
```
-----BEGIN RSA PUBLIC KEY-----
MIGJAoGBAMZqnNOKG/8sDiQIbSDAMWit4FrdVBKZkagPEdQFwRP+/JOUcsbXm+tE
E8gI1iA/MVM7qFoYSKYcPQNqwsw5er0/jmljVXbq3Yur+BZmDlzNQKsV2yubua2W
bagxJBC+p+rH/GRE9t39lg2Zv8RdelcnpW2i27NY/sSRsK2A3mmNAgMBAAE=
-----END RSA PUBLIC KEY-----
```

### 2.5 nxio3.npyd.dll 的依赖链

```
nxio3.npyd.dll 依赖:
  nxio3.dll          (核心IO)
  nxbinding.dll      (Python绑定)
  python311.dll      (Python 3.11运行时)
  npk_zstd.dll       (zstd压缩)
  nxfilesystem.dll   (文件系统/NPK)
  npk.dll            (NPK包)
  lz4.dll            (lz4压缩)
  nxio.dll
  stringid.dll
  libcrypto-1_1-x64.dll  (OpenSSL, RSA)
```

`PyInit_nxio3` 导出存在 → 它本身是 Python C 扩展模块，游戏通过 `import nxio3` 加载。

---

## 三、NPK 解包：根本不需要 Hook

### 3.1 script.npk 结构（实测，明文可读）

```
偏移 0:   "NXPK"        魔数
偏移 4:   14319         文件数（与HANDOVER记录吻合！）
偏移 8:   0,0,0         reserved
偏移 16:  index_offset  索引表偏移 (=0x4F2E0D8)
```

**索引表（明文，无需解密）**，每条记录28字节：
```
struct IndexEntry {
    uint32 sign;        // 文件名hash
    uint32 offset;      // 在NPK中的偏移
    uint32 length;      // 文件长度
    uint32 orig_length; // 原始长度
    uint32 zcrc;
    uint32 crc;
    uint32 flag;        // 标志位
};
```

**结论**：按 offset/length 直接切片即可从 NPK 取出每个 NXZ。**前辈"批量解包→14319个.nxz"这步其实是成功的**，真正的卡点 100% 在 NXZ 解密层。

### 3.2 NPK vs Documents 缓存的差异（重要发现）

同一个文件（如 `main_chat_tips_assistant_p.nxz`）：
- NPK 里的版本 和 `Documents/script/` 里的版本：**头部相同，payload 字节20起完全不同**
- 说明 Documents 里的是**运行时二次处理后的版本**（可能用不同密钥重新加密，或 SIMPLE key 的随机种子不同）

---

## 四、社区资料对照（前辈未查的）

| 来源 | 关键信息 | 对我们的适用性 |
|---|---|---|
| [ZhangFengze/NeoXResearch](https://github.com/ZhangFengze/NeoXResearch) | 说 NXZ 用 AES-128-ECB，密钥=MD5(版本号) | ⚠️ **部分错**：我们实测偏移12全=0（非origSize），且无ECB重复块 |
| [zhouhang95/neox_tools](https://github.com/zhouhang95/neox_tools) | NPK用RC4-like流密码(XOR)，硬编码256字节key表 | ⚠️ 适用于旧作(阴阳师)；**我们的NPK索引明文无需解密**，NXZ层不同 |
| [ExIfDev/Aexadev_NeoX_Extractor](https://github.com/ExIfDev/Aexadev_NeoX_Extractor) | 声称支持script提取 | ❌ 明确"不公开" |
| ResHax论坛 | 阴阳师NPK解包后是zstd | ⚠️ 拉格朗日多了一层加密 |

**结论**：社区工具都是针对**旧版本/其他游戏**，拉格朗日的 G86 变体更新，现成工具不直接适用。但算法框架（RSA+对称+zstd）与 DLL 内嵌文档一致。

---

## 五、★ 改进方案：三条可行路径（按推荐度排序）

### 路径A（★强烈推荐）：运行时调用导出函数

**原理**：`DecryptDataWithCompress` 是导出函数，注入 DLL 后直接调用，无需猜偏移。

```
1. 写一个 loader.exe / injector.dll
2. 启动游戏（或 Attach 到游戏进程）
3. 在游戏进程内加载我们的 hook DLL
4. 我们 DLL 里:
   GetModuleHandle("nxio3.npyd.dll")  // 游戏已加载它
   // 方案A1: 通过 Python 绑定调用（最优雅）
   //   游戏的 Python 解释器里执行:
   //   import nxio3
   //   imp = nxio3.PyNxioImporter("script:/")
   //   imp.set_public_key(<内嵌的RSA公钥>)
   //   plain = imp.decrypt_data_with_compress(nxz_bytes, compress_type)
   // 方案A2: 直接 GetProcAddress + 函数指针调用（需处理 thiscall 和 string 返回）
5. 把所有 NXZ 批量解密 → 落盘 .py 文件
```

**优势**：
- ✅ 不猜偏移，函数名/签名都已知
- ✅ 密钥由游戏自己设置（不用我们破解密钥派生）
- ✅ 一次解密全部 14319 个文件
- ✅ 可复用（每次游戏更新只要函数签名不变就能用）

**难点**：
- `DecryptData` 是成员函数（thiscall），需构造 `PyNxioImporter` 实例（调 `InitPythonImporter`）
- 或走 Python 绑定路径，需在游戏 Python 里执行代码（可用 `PyRun_SimpleString`）
- 注入需绕过反作弊（游戏有 `crashhunter.dll`、`nxacsdk.dll`）

### 路径B（中推荐）：Frida 动态插桩

**原理**：用 Frida（动态插桩框架）在运行时 hook `DecryptDataWithCompressPy` 的返回值。

```python
# frida 脚本伪代码
import frida
session = frida.attach("infinite_lagrange_cn.exe")
script = session.create_script("""
    var nxio3 = Module.findBaseAddress("nxio3.npyd.dll");
    var decryptPy = Module.findExportByName("nxio3.npyd.dll", 
        "?DecryptDataWithCompressPy@PyNxioImporter@nxio3@neox@@QEAAPEAU_object@@PEAVBytes@binding@3@@Z");
    Interceptor.attach(decryptPy, {
        onLeave(retval) {
            // retval 是 PyObject* (bytes)，读取并保存
            var data = readPyBytes(retval);
            send({type:'decrypted', data: data});
        }
    });
""")
```

**优势**：比手写 DLL 简单得多，Frida 处理了调用约定/内存管理
**难点**：Frida 本身可能被反作弊检测

### 路径C（低推荐，纯离线）：逆向密钥派生

**原理**：反编译 `nxio3.npyd.dll` 的 `SetPublicKey`/`DecryptData` 实现，搞清 ENC_SIMPLE/RC4/AES 具体怎么用 RSA 公钥派生对称密钥，然后纯离线解密。

**优势**：完全离线，不依赖游戏运行
**难点**：工作量大（需 IDA/Ghidra 反编译 C++ 代码），且 RSA 私钥可能不在客户端（只有公钥，那 SIMPLE/RC4 的对称 key 如何获得是核心难题）

---

## 六、立即可做的下一步（无需用户参与）

以下分析我现在就能做，用来支撑路径A/B：

1. **确认 `InitPythonImporter` 的调用约定和参数**（prefix="script:/" 的含义）
2. **反汇编 `DecryptData` 函数体**（用 objdump/capstone 看 x64 指令，确认它调用什么）
3. **分析第二个 PEM 块**（偏移113013的63字节短公钥，可能是不同用途的key）
4. **写路径A的注入器原型**（检测游戏进程、加载nxio3、调用解密）

---

## 七、对战斗模拟器项目的价值

即使只解密出**战斗相关模块**（`scene_zoom0/battle_command/`、`data/battle/`、`scene_zoom0/buff_effect/` 等），就能：
1. **直接看到命中率/伤害判定源码** → 解决 04文档的核心未解问题（命中判定具体形式）
2. **看到 buff 触发逻辑** → 验证 60%血+45s 模型
3. **看到 AttackCommand 的 damage_list 处理** → 搞清 `damage_list=[-1]` 的真实含义
4. **提取 Tb_ship/武器配置表** → 精确数值替代黑盒反推

这是**比黑盒实测强一个数量级的白盒证据**。
