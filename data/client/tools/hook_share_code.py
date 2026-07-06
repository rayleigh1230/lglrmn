# -*- coding: utf-8 -*-
"""
分享码实时 Hook 脚本（实时推送版）
====================================
拦截协议层 send_protocol_with_callback，过滤分享码相关协议，
通过 frida send() 实时把数据流推回 Python 打印。

用法：
  1. 保持游戏运行
  2. python data/client/tools/hook_share_code.py
  3. 去游戏里操作（生成分享码 / 导入分享码），脚本实时打印数据流
  4. Ctrl+C 停止（会自动恢复原函数）

输出标记：
  [→发送 GEN]    生成分享码时客户端发什么给服务器
  [←回调 GEN]    服务器返回什么（看这里有没有生成的码 = 判定关键）
  [→发送 GET]    导入分享码时发的码
  [←回调 GET]    服务器返回的方案数据
"""
import frida
import time
import sys

JS_HOOK = r"""
var log = [];
function flush() {
    // 把累积的 log 通过 send 推回
    send({ type: "log", lines: log.slice() });
    log.length = 0;
}

var setupCode = [
    "import sys as _sys, traceback as _tb, json as _json, functools as _ft",
    "_FRIDA_OUT = None",
    "_HOOK_LOG = []",  // 全局队列, hook 函数往里写, poll 取走
    "try:",
    "    import core_framework.my_network.net_cmd_mgr as _ncm",
    "    import common.config.network.protocol as _proto",
    "    import gc as _gc; _gc.collect()",
    "    # 协议号",
    "    _GEN = _proto.BP_ENHANCE_SYS_SCHEME_GEN_SHARE_CODE",
    "    _GET = _proto.BP_ENHANCE_SYS_SCHEME_GET_INFO_BY_SHARE_CODE",
    "    _BAT = getattr(_proto, 'BP_ENHANCE_SYS_SCHEME_BAT_GET_INFO_BY_SHARE_CODE', -1)",
    "    # 找 NetCmdMgr 实例",
    "    _inst = None",
    "    for _o in _gc.get_objects():",
    "        if isinstance(_o, _ncm.NetCmdMgr): _inst = _o; break",
    "    if not _inst: raise RuntimeError('no NetCmdMgr instance')",
    "    _orig_send = _inst.send_protocol",
    "    _orig_send_cb = _inst.send_protocol_with_callback",
    "    def _dump(p):",
    "        try:",
    "            d = {}",
    "            for a in dir(p):",
    "                if a.startswith('_'): continue",
    "                try:",
    "                    v = getattr(p, a)",
    "                    if callable(v): continue",
    "                    d[a] = repr(v)[:500]",
    "                except: pass",
    "            return _json.dumps(d, ensure_ascii=False)",
    "        except Exception as e: return 'dump_err:' + str(e)[:80]",
    "    def _tag(cid):",
    "        if cid == _GEN: return 'GEN_SHARE_CODE'",
    "        if cid == _GET: return 'GET_INFO_BY_SHARE_CODE'",
    "        if cid == _BAT: return 'BAT_GET_INFO'",
    "        return None",
    "    @_ft.wraps(_orig_send)",
    "    def _h_send(p, *a, **k):",
    "        try:",
    "            cid = getattr(p, 'CMD_ID', getattr(p, 'cmd_id', 0))",
    "            t = _tag(cid)",
    "            if t: _HOOK_LOG.append('[发送 ' + t + '] ' + _dump(p))",
    "        except Exception as e: _HOOK_LOG.append('h_send err:' + str(e)[:60])",
    "        return _orig_send(p, *a, **k)",
    "    @_ft.wraps(_orig_send_cb)",
    "    def _h_send_cb(p, cb, *a, **k):",
    "        try:",
    "            cid = getattr(p, 'CMD_ID', getattr(p, 'cmd_id', 0))",
    "            t = _tag(cid)",
    "            if t:",
    "                _HOOK_LOG.append('[发送 ' + t + ' 带回调] ' + _dump(p))",
    "                @_ft.wraps(cb)",
    "                def _wcb(*cba, **cbk):",
    "                    try:",
    "                        _HOOK_LOG.append('[回调返回 ' + t + '] ' + _json.dumps([repr(x)[:600] for x in cba], ensure_ascii=False))",
    "                    except Exception as e: _HOOK_LOG.append('wcb err:' + str(e)[:60])",
    "                    return cb(*cba, **cbk)",
    "                return _orig_send_cb(p, _wcb, *a, **k)",
    "        except Exception as e: _HOOK_LOG.append('h_send_cb err:' + str(e)[:60])",
    "        return _orig_send_cb(p, cb, *a, **k)",
    "    _inst.send_protocol = _h_send",
    "    _inst.send_protocol_with_callback = _h_send_cb",
    "    # 存原始引用以便恢复",
    "    _inst._orig_send_protocol = _orig_send",
    "    _inst._orig_send_protocol_with_callback = _orig_send_cb",
    "    _FRIDA_OUT = 'HOOK 安装成功, 协议 GEN=' + str(_GEN) + ' GET=' + str(_GET) + ' BAT=' + str(_BAT)",
    "except Exception as e:",
    "    _FRIDA_OUT = 'SETUP_FAIL: ' + str(e)"
].join("\n");

var pollCode = [
    "import json as _json",
    "_FRIDA_OUT = _json.dumps(list(_HOOK_LOG))",
    "_HOOK_LOG.clear()"
].join("\n");

var restoreCode = [
    "_FRIDA_OUT = None",
    "try:",
    "    _inst.send_protocol = _inst._orig_send_protocol",
    "    _inst.send_protocol_with_callback = _inst._orig_send_protocol_with_callback",
    "    _FRIDA_OUT = 'restored'",
    "except Exception as e:",
    "    _FRIDA_OUT = 'restore fail: ' + str(e)"
].join("\n");

function pyrun(code) {
    var py = Process.getModuleByName("python311.dll");
    var Ens = new NativeFunction(py.getExportByName("PyGILState_Ensure"), 'pointer', []);
    var Rel = new NativeFunction(py.getExportByName("PyGILState_Release"), 'void', ['pointer']);
    var Run = new NativeFunction(py.getExportByName("PyRun_SimpleString"), 'int', ['pointer']);
    var AddM = new NativeFunction(py.getExportByName("PyImport_AddModule"), 'pointer', ['pointer']);
    var GetA = new NativeFunction(py.getExportByName("PyObject_GetAttrString"), 'pointer', ['pointer','pointer']);
    var Str = new NativeFunction(py.getExportByName("PyObject_Str"), 'pointer', ['pointer']);
    var UTF8 = new NativeFunction(py.getExportByName("PyUnicode_AsUTF8"), 'pointer', ['pointer']);
    var c = Memory.allocUtf8String(code);
    var gil = Ens();
    var rc = Run(c);
    var out = null;
    if (rc == 0) {
        var mod = AddM(Memory.allocUtf8String("__main__"));
        var v = GetA(mod, Memory.allocUtf8String("_FRIDA_OUT"));
        if (!v.isNull()) { var st = Str(v); var cs = UTF8(st); if (!cs.isNull()) out = cs.readUtf8String(); }
    }
    Rel(gil);
    return { rc: rc, out: out };
}

rpc.exports = {
    setup: function() {
        var r = pyrun(setupCode);
        return r;
    },
    poll: function() {
        var r = pyrun(pollCode);
        return r;
    },
    restore: function() {
        var r = pyrun(restoreCode);
        return r;
    }
};
"""

def main():
    procs = [p for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
    if not procs:
        print("错误：没找到游戏进程，请先启动游戏")
        sys.exit(1)
    pid = procs[0].pid
    print(f"附加到游戏 PID={pid}")

    session = frida.attach(pid)
    script = session.create_script(JS_HOOK)
    script.load()

    # 1. 安装 hook
    r = script.exports_sync.setup()
    print(f"  setup rc={r['rc']}")
    if r["out"]:
        print("  " + r["out"])
    if r["rc"] != 0 or (r["out"] and "SETUP_FAIL" in r["out"]):
        print("HOOK 安装失败，退出")
        session.detach()
        sys.exit(1)

    print("\n" + "=" * 60)
    print("HOOK 已安装，现在去游戏里生成/导入分享码")
    print("（生成：强化方案→保存→生成码；导入：粘贴码查询）")
    print("Ctrl+C 停止并恢复")
    print("=" * 60 + "\n")

    # 2. 持续轮询 hook 日志
    try:
        while True:
            r = script.exports_sync.poll()
            if r["rc"] == 0 and r["out"]:
                import json
                try:
                    lines = json.loads(r["out"])
                    for line in lines:
                        print(line)
                except:
                    print(r["out"])
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n正在恢复...")
    finally:
        try:
            script.exports_sync.restore()
            print("已恢复原函数")
        except Exception as e:
            print(f"恢复失败: {e}")
        try:
            session.detach()
        except:
            pass

if __name__ == "__main__":
    main()
