import ctypes
import win32api
dllname = "MvCameraControl.dll"
try:
    if "winmode" in ctypes.WinDLL.__init__.__code__.co_varnames:
        MvCamCtrldll = ctypes.WinDLL(dllname,winmode = 0)
    else:
        MvCamCtrldll = ctypes.WinDLL(dllname)

    dll_handle = MvCamCtrldll._handle
    loaded_dll_path = win32api.GetModuleFileName(dll_handle)
    print(loaded_dll_path)
except Exception as e:
    print("Err loading")