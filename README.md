# <em>z-xr</em>
 3D objects viewer in XR environment

### <em>Usage</em><br>

  Edit file zvr.js to point to your model:
  ```
  33: const OBJ_PATH = 'data/models/spiral/spiral.obj';
  34: const TEX_PATH = 'data/models/spiral/spiral.bmp';
  35: const NOR_PATH = 'data/models/spiral/spiral_nm.bmp';
  ```
  Install node:<br>
  <a href='https://nodejs.org/en/download'>https://nodejs.org/en/download</a> 

  Install dependencies and run server:
  ```
  npm install
  npm start
  ```
  Locate in PC browser:
  ```
  http://localhost:3000
  ```

  Connect headset and check connection: 
  ```
  .\bin\adb devices
  ```

  Forward port to headset:
  ```
  .\bin\adb reverse tcp:3000 tcp:3000
  ```

  Locate in headset's browser:
  ```
  http://localhost:3000
  ```
  
  Now you can export model from Z-Brush on PC and view it in headset's browser just by refreshing it.<br>
  
  Contact: [LinkedIn](https://www.linkedin.com/in/sergey-yanenko-57b21a96/).
