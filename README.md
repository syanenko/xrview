# <em>z-xr</em>
 View 3D objects in XR environment. Useful for quick view of ZBrush exports in VR headsets.<br>
 Live demo: <a href='https://zxr.yesbird.ru'>zxr.yesbird.ru</a>

### <em>Usage</em><br>

  Edit file <em>zvr.js</em> to point to your model:
  ```
  11: const OBJ_PATH = 'data/models/spiral/spiral.obj';
  12: const TEX_PATH = 'data/models/spiral/spiral.bmp';
  13: const NOR_PATH = 'data/models/spiral/spiral_nm.bmp';
  ```
  Install node: <a href='https://nodejs.org/en/download'>nodejs.org/en/download</a> 

  Install dependencies and run server:
  ```
  npm install
  npm start
  ```
  Open location in PC browser:
  ```
  http://localhost:3000
  ```
  Try to use video from camera as background by clicking on icon <img src="https://github.com/syanenko/zxr/assets/6688301/15b0cefd-ef55-44d8-98a8-cc21b1bf314c"/>. 

  Connect headset by USB and check connection: 
  ```
  .\bin\adb devices
  ```

  Forward port to headset:
  ```
  .\bin\adb reverse tcp:3000 tcp:3000
  ```

  Open location in headset's browser:
  ```
  http://localhost:3000
  ```
  
  Now you can export model from Z-Brush on PC and view it in headset's browser just by refreshing it.<br>
  
  Contact: [LinkedIn](https://www.linkedin.com/in/sergey-yanenko-57b21a96/).
