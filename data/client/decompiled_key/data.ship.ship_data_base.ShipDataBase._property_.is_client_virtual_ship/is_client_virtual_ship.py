# Source Generated with Decompyle++
# File: is_client_virtual_ship.pyc (Python 3.11)

SCENE_ZOOM0 = SCENE_ZOOM0
import common.common_definition
SceneManager = SceneManager
import common.scene_manager
zoom0_scene = SceneManager().try_get_scene_instance(SCENE_ZOOM0)
if zoom0_scene and zoom0_scene.ship_manager:
    return zoom0_scene.ship_manager.is_client_virtual_ship(self.ship_uid)
