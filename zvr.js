import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';
import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { GUI } from 'three/addons/libs/lil-gui.esm.min.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let container, loader;
let camera, scene, renderer;
let textureLoader;
let gui, gui_mesh;
let param_changed = false;

let beam;
const beam_color = 0xffffff;
const beam_hilight_color = 0x222222;

let controls;
let controller;
let directionalLight, pointLight, ambientLight;

let model;
// Defaults
let modelPosition = [0, 0, -1.6];
let modelRotation = [0.6, 0, 0];

let video, video_mesh;

// Default model
let obj_path = 'data/models/spiral/spiral.obj';
let tex_path = 'data/models/spiral/spiral.bmp';
let nor_path = 'data/models/spiral/spiral_nm.bmp'; // TODO: Fix artefacts

// GUI
const params = {
  upload: function() { let form = document.getElementById("form_upload");
                       form.style.visibility == "visible" ? form.style.visibility = 'hidden': form.style.visibility = "visible"; },
  scale: 1.0,
  x:     modelPosition[0],
  y:     modelPosition[1],
  z:     modelPosition[2],
  rx:    modelRotation[0],
  ry:    modelRotation[1],
  rz:    modelRotation[2],
  anx: false,
  any: false,
  anz: false,
  switch_anx: function() {params.anx = !params.anx;
                          let color = params.anx ? "#00ff00" : "#ff9127";
                          gui.controllers[11].$name.style.color = color;
                          param_changed = true;},

  switch_any: function() {params.any = !params.any;
                          let color = params.any ? "#00ff00" : "#ff9127";
                          gui.controllers[12].$name.style.color = color;
                          param_changed = true;},

  switch_anz: function() {params.anz = !params.anz;
                          let color = params.anz ? "#00ff00" : "#ff9127";
                          gui.controllers[13].$name.style.color = color;
                          param_changed = true;},
  speed: -0.007 }

init();
animate();

// Init
function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera( 85, window.innerWidth / window.innerHeight, 0.01, 10000 );
  camera.position.z = 1;
  scene.add( camera );

  initVideo();
  initLights();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  
  // XR
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType( 'local' );
  renderer.xr.setFramebufferScaleFactor( 4.0 );
  container.appendChild( renderer.domElement );

  // Loader
  textureLoader = new THREE.TextureLoader();

  initControls();
  initGUI();  
  initController();

  // DEBUG ! 
  loadModel({test:false});
  params.switch_any(); // Turntable by default
  
  document.getElementById("video_button").onclick = switchVideo;
  document.body.appendChild( VRButton.createButton( renderer ) );
}

// Video
function switchVideo()
{
  if (video.paused)
  {
    if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
      const constraints = { video: { width: 1280, height: 720, facingMode: 'user' } };

      navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ) {
        video.srcObject = stream;
      } ).catch( function ( error ) {
        console.error( 'Unable to access the camera/webcam.', error );
      } );
    } else {
      console.error( 'MediaDevices interface not available.' );
    }

    video.play();
    video_mesh.visible = true;

    controls.reset();
    controls.target.fromArray( modelPosition );
    controls.enabled = false;
  } else {
    video_mesh.visible = false;
    video.srcObject.getTracks()[0].stop();
    video.srcObject = null;

    controls.enabled = true;
  }
}

// Video stream
function initVideo()
{
  // TODO: Fit to window
  video = document.getElementById( 'video' );
  const texture = new THREE.VideoTexture( video );
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(160, 90);
  const material = new THREE.MeshBasicMaterial( { map: texture } );
  video_mesh = new THREE.Mesh( geometry, material );
  video_mesh.lookAt( camera.position );
  video_mesh.position.set(0,0,-60);
  video_mesh.scale.x = -1; // Mirror
  video_mesh.visible = false;
  scene.add( video_mesh );
}

// Load model
export function loadModel(args)
{
  // Stop animation
  params.anx ? params.switch_anx():0;
  params.any ? params.switch_any():0;
  params.anz ? params.switch_anz():0;

  // Cleanup scene
  const curModel = scene.getObjectByName('model');
  if (typeof curModel !== "undefined") {
    curModel.geometry.dispose();
    curModel.material.dispose();
    scene.remove( curModel );
    renderer.renderLists.dispose();
  }

  // Test object
  if(args.test)
  {
    const geometry = new THREE.CylinderGeometry( 0.5, 0.5, 1.5, 64, 1);
    const mat = new THREE.MeshPhongMaterial( {color: 0x00fa00, transparent:false, side: THREE.DoubleSide } );
    model = new THREE.Mesh(geometry, mat);
    model.translateZ(-0.4);
    controls.target.set(0, 0, -0.4);
    model.name='model';
    scene.add(model);
    return;
  }

  if(args.model)
  {
    model = args.model;
    console.log(model['model']);
    console.log(model['texture']);
    console.log(model['normals']);

    obj_path  = model['model'];
    tex_path  = model['texture'];
    nor_path =  model['normals']
  }
   
  const diffuseMap = textureLoader.load( tex_path );
  diffuseMap.colorSpace = THREE.SRGBColorSpace;
  const normalMap = textureLoader.load( nor_path );

  console.dir(normalMap);

  // Material
  const material = new THREE.MeshPhongMaterial( {
    color: 0xefefef,
    specular: 0x222222,
    shininess: 35,
    map: diffuseMap,
    // specularMap: specularMap,
    normalMap: normalMap,
    normalMapType: THREE.TangentSpaceNormalMap,
    // normalMapType: THREE.ObjectSpaceNormalMap,
    normalScale: new THREE.Vector2( 2, 2 )
  } );
  material.side = THREE.DoubleSide;

  loader = new OBJLoader();
  loader.load( obj_path, function ( object ) {
    const geometry = object.children[0].geometry;
    model = new THREE.Mesh( geometry, material );

    model.position.fromArray(modelPosition);
    model.rotateX(modelRotation[0]);
    model.rotateY(modelRotation[1]);
    model.rotateZ(modelRotation[2]);

    controls.target.fromArray(modelPosition);
    model.name='model';
    scene.add( model );
  });
}
window.loadModel = loadModel;

// Init orbit controlls
function initControls()
{
  controls = new OrbitControls( camera, renderer.domElement );
  controls.target.set( params.x, params.y, params.z );
  controls.update();
  controls.enablePan = true;
  controls.enableDamping = true;
}

// Init lights
function initLights()
{
  ambientLight = new THREE.AmbientLight( 0xffffff );
  scene.add( ambientLight );

  pointLight = new THREE.PointLight( 0xffffff, 30 );
  pointLight.position.set( 0, 0, 6 );
  scene.add( pointLight );

  directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
  directionalLight.position.set( 1, - 0.5, - 1 );
  scene.add( directionalLight );

  // Hilight controller
  const light = new THREE.PointLight( 0xffffff, 2, 1, 0);
  light.position.set( 0, 0, 0 );
  scene.add( light );
}

// Init GUI
function initGUI()
{
  // GUI
  gui = new GUI( {width: 300, title:"Settings", closeFolders:true} ); // Check 'closeFolders' - not working
  gui.add( params, 'upload').name( 'Upload model' ).$name.style.color = "#ff9127";
  gui.add( params, 'scale', 0.1, 5.0, 0.01 ).name( 'Scale' ).onChange(onScale);
  gui.add( params, 'x', -5.0, 5.0, 0.01 ).name( 'X' ).onChange(onX);
  gui.add( params, 'y', -5.0, 5.0, 0.01 ).name( 'Y' ).onChange(onY);
  gui.add( params, 'z', -10, -0.3, 0.01 ).name( 'Z' ).onChange(onZ);
  gui.add( params, 'rx', -Math.PI/2, Math.PI/2, 0.01 ).name( 'Rot X' ).onChange( onRotation );
  gui.add( params, 'ry', -Math.PI/2, Math.PI/2, 0.01 ).name( 'Rot Y' ).onChange( onRotation );
  gui.add( params, 'rz', -Math.PI/2, Math.PI/2, 0.01 ).name( 'Rot Z' ).onChange( onRotation );
  gui.add( params, 'anx').hide();
  gui.add( params, 'any').hide();
  gui.add( params, 'anz').hide();
  gui.add( params, 'switch_anx').name( 'Animate X' );
  gui.add( params, 'switch_any').name( 'Animate Y' );
  gui.add( params, 'switch_anz').name( 'Animate Z' );
  gui.add( params, 'speed', -0.02, 0.02, 0.001 ).name( 'Speed' ).onChange( ()=>{param_changed = true;} );
  gui.add( gui.reset(), 'reset' ).name( 'Reset' ).onChange(onReset); onReset();

  const group = new InteractiveGroup( renderer, camera );
  scene.add( group );

  // GUI position
  gui_mesh = new HTMLMesh( gui.domElement );
  gui_mesh.rotation.x = -Math.PI / 9;
  gui_mesh.position.y = -0.36;
  gui_mesh.position.z = -0.6;
  group.add( gui_mesh );
  gui_mesh.visible = false;
}

// Init controller
function initController()
{
  controller = renderer.xr.getController( 0 );

  // Grip 
  const controllerModelFactory = new XRControllerModelFactory();
  const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
  controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
  scene.add( controllerGrip1 );

  // Beam
  const beam_geom = new THREE.CylinderGeometry( 0.003, 0.005, 1, 4, 1, true);
  const alpha = textureLoader.load('data/textures/beam_alpha.png');
  const beam_mat = new THREE.MeshStandardMaterial({ transparent: true,
                                                    alphaMap:alpha,
                                                    lightMapIntensity:0,
                                                    opacity: 0.8,
                                                    color: beam_color,
                                                    // emissive: 0xffffff
                                                    alphaTest:0.01
                                                    });
  beam = new THREE.Mesh(beam_geom, beam_mat);
  beam.name = 'beam';
  beam.receiveShadow = false;

  // Alight beam to grip
  beam.rotateX(Math.PI / 2);
  beam.translateY(-0.5);
  controller.add(beam);
  scene.add( controller );

  controller.addEventListener( 'selectstart', onSelectStart );
  controller.addEventListener( 'selectend', onSelectEnd );

  window.addEventListener( 'resize', onWindowResize );
}

//
//  Controller events
//
function onSelectStart( event )
{
  // Hilight beam
  const controller = event.target;
  let beam = controller.getObjectByName( 'beam' );
  beam.material.color.set(beam_hilight_color);
  beam.material.emissive.g = 0.5;

  param_changed = false;
}

function onSelectEnd( event )
{
  // Dehilight beam
  const controller = event.target;
  beam = controller.getObjectByName( 'beam' );
  beam.material.color.set(beam_color);
  beam.material.emissive.g = 0;

  if(param_changed)
  {
    param_changed = false;
    return;
  }

  gui_mesh.visible = !gui_mesh.visible;
}

//
// GUI changes
//
function onScale() {
  if (typeof model == "undefined") { return; }
  model.scale.setScalar( params.scale );
  param_changed = true;
}

function onX() {
  if (typeof model == "undefined") { return; }
  model.position.setX( params.x );
  param_changed = true;
}

function onY() {
  if (typeof model == "undefined") { return; }
  model.position.setY( params.y );
  param_changed = true;
}

function onZ() {
  if (typeof model == "undefined") { return; }
  model.position.setZ( params.z );
  param_changed = true;
}

function onRotation()
{
  if (typeof model == "undefined") { return; }
  const euler = new THREE.Euler( params.rx, params.ry, params.rz, 'XYZ' );
  model.setRotationFromEuler(euler);
  param_changed = true;
}

function onReset()
{
  gui.controllers[11].$name.style.color = "#ff9127";
  gui.controllers[12].$name.style.color = "#ff9127";
  gui.controllers[13].$name.style.color = "#ff9127";
  gui.controllers[15].$name.style.color = "#ff9127";

  controls.reset();
  controls.target.set( params.x, params.y, params.z );

  if (typeof model !== "undefined") {
    model.position.fromArray(modelPosition);
  }
}

// XR start 
renderer.xr.addEventListener( 'sessionstart', function ( event ) {
  renderer.setClearColor(new THREE.Color(0x000), 1);
  gui_mesh.visible = true;
  
  if(!video.paused) {
    switchVideo();
  }
});

// XR end
renderer.xr.addEventListener( 'sessionend', function ( event ) {
  renderer.setClearColor(new THREE.Color(0x000), 0);
  gui_mesh.visible = false;
});

// Resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

// Animate
function animate() {
  renderer.setAnimationLoop( render );
}

// Render
function render() {
  if (typeof model == "undefined") { return; }
  controls.update();

  if (params.anx) {
    model.rotateX(params.speed);
  }

  if (params.any) {
    model.rotateY(params.speed);
  }

  if (params.anz) {
    model.rotateZ(params.speed);
  }

  renderer.render( scene, camera );
}
