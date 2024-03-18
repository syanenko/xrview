// TODO
// -- Fix camera changes on VR mode

import * as THREE from './three/three.module.js';
import { OrbitControls } from './three/jsm/controls/OrbitControls.js';
import { OBJLoader } from './three/jsm/loaders/OBJLoader.js';
import { VRButtonIcon } from './three/jsm/webxr/VRButtonIcon.js';
import { InteractiveGroup } from './three/jsm/interactive/InteractiveGroup.js';
import { HTMLMesh } from './three/jsm/interactive/HTMLMesh.js';
import { GUI } from './three/jsm/libs/lil-gui.esm.min.js';
import { XRControllerModelFactory } from './three/jsm/webxr/XRControllerModelFactory.js';

// Model to load
const OBJ_PATH = 'data/models/venus/venus.obj';
const TEX_PATH = '';
const NOR_PATH = '';
/* 
const OBJ_PATH = 'data/models/spiral/spiral.obj';
const TEX_PATH = 'data/models/spiral/spiral.bmp';
const NOR_PATH = 'data/models/spiral/spiral_nm.bmp';
*/

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

let model, video;

// GUI
const params = {
  scale: 1.0,
  x:     0,
  y:     0,
  z:     0,
  rx:    0,
  ry:    0,
  rz:    0,
  anx: false,
  any: false,
  anz: false,
  switch_anx: function() {params.anx = !params.anx;
                          let color = params.anx ? "#00ff00" : "#ff9127";
                          gui.controllers[10].$name.style.color = color;
                          param_changed = true;},

  switch_any: function() {params.any = !params.any;
                          let color = params.any ? "#00ff00" : "#ff9127";
                          gui.controllers[11].$name.style.color = color;
                          param_changed = true;},

  switch_anz: function() {params.anz = !params.anz;
                          let color = params.anz ? "#00ff00" : "#ff9127";
                          gui.controllers[12].$name.style.color = color;
                          param_changed = true;},
  speed: -0.007 }

init();
animate();

// Init
function init() {
  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1100 );
  camera.position.set( 0, 0, 0 );
  scene.add( camera );

  video = document.getElementById( 'video' );
  initLights();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, maxSamples: 4, alpha: true });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  
  // XR
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType( 'local' );
  renderer.xr.setFramebufferScaleFactor( 4.0 );

  container = document.getElementById("container");
  container.appendChild( renderer.domElement );

  // Loader
  textureLoader = new THREE.TextureLoader();

  // initControls();
  initGUI();  
  initController();

  // Default model on startup
  loadModel({test:false,
             model: {model: OBJ_PATH, texture: TEX_PATH, normals: NOR_PATH }});
    
  document.getElementById("video_button").onclick = switchVideo;
  document.body.appendChild( VRButtonIcon.createButton( renderer ) );
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
    video.style.visibility = 'visible';

  } else {
    video.style.visibility = 'hidden';
    video.srcObject.getTracks()[0].stop();
    video.srcObject = null;
  }
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
    var objPath = model['model'];
    var texPath = model['texture'];
    var norPath = model['normals']
  } else {
    console.log('Error: no model in function argumets');
    return;
  }
   
  let diffuseMap = '';
  let color = 0xffd47f;
  if (texPath !== '') {
    diffuseMap = textureLoader.load( texPath );
    diffuseMap.colorSpace = THREE.SRGBColorSpace;
    color = 0xffffff;
  }

  let normalMap = '';
  if (norPath !== '') {
    normalMap = textureLoader.load( norPath );
  }
  
  // Material
  const material = new THREE.MeshPhongMaterial( {
    color: color,
    specular: 0x222222,
    shininess: 35,
    map: diffuseMap,
    normalMap: normalMap,
    normalMapType: THREE.TangentSpaceNormalMap,
    normalScale: new THREE.Vector2( 2, 2 )
  } );
  material.side = THREE.DoubleSide;
  
  // Geometry
  loader = new OBJLoader();
  loader.load( objPath, function ( object ) {
    const geometry = object.children[0].geometry;
    model = new THREE.Mesh( geometry, material );

    var bb = new THREE.Box3().setFromObject(model);
    let width  = bb.max.x - bb.min.x;
    let height = bb.max.y - bb.min.y; 
    let depth  = bb.max.z - bb.min.z;
    let maxSide = Math.floor(Math.max(width, height, depth));
    model.position.copy(new THREE.Vector3( 0, 0, -maxSide * 1.5));

    // X
    gui.children[1]._min = -maxSide * 2;
    gui.children[1]._max =  maxSide * 2;
    gui.children[1].initialValue = 0;

    // Y
    gui.children[2]._min = -maxSide * 2;
    gui.children[2]._max =  maxSide * 2;
    gui.children[2].initialValue = 0;

    // Z (depth)
    gui.children[3]._min = model.position.z * 3;
    gui.children[3]._max = 0;
    gui.children[3].initialValue = model.position.z;
    gui.reset();

    // controls.target.copy(modelPosition);
    model.name='model';
    scene.add( model );
  
    params.switch_any(); // Turntable by default
  });
}
window.loadModel = loadModel;

// Init orbit controlls
/*
function initControls()
{
  controls = new OrbitControls( camera, renderer.domElement );
  controls.target.set( params.x, params.y, params.z );
  controls.update();
  controls.enablePan = true;
  // controls.enableDamping = true;
}
*/

// Init lights
function initLights()
{
  ambientLight = new THREE.AmbientLight( 0xffffff );
  scene.add( ambientLight );

  pointLight = new THREE.PointLight( 0xffffff, 30 );
  pointLight.position.set( 0, 0, 6 );
  scene.add( pointLight );

  directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
  directionalLight.position.set( -1, -0.5, 1 );
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
  gui.add( params, 'scale', 0.1, 5.0, 0.01 ).name( 'Scale' ).onChange(onScale);
  gui.add( params, 'x', -300, 300, 0.01 ).name( 'X' ).onChange(onX);
  gui.add( params, 'y', -200, 200, 0.01 ).name( 'Y' ).onChange(onY);
  gui.add( params, 'z', -1000, 0, 0.01 ).name( 'Z' ).onChange(onZ);
  gui.add( params, 'rx', -Math.PI, Math.PI, 0.01 ).name( 'Rot X' ).onChange( onRotation );
  gui.add( params, 'ry', -Math.PI, Math.PI, 0.01 ).name( 'Rot Y' ).onChange( onRotation );
  gui.add( params, 'rz', -Math.PI, Math.PI, 0.01 ).name( 'Rot Z' ).onChange( onRotation );
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
  gui.controllers[10].$name.style.color = "#ff9127";
  gui.controllers[11].$name.style.color = "#ff9127";
  gui.controllers[12].$name.style.color = "#ff9127";
  gui.controllers[14].$name.style.color = "#ff9127";

  //controls.reset();
  //controls.target.set( params.x, params.y, params.z );
}

// XR start 
renderer.xr.addEventListener( 'sessionstart', function ( event ) {
  renderer.setClearColor(new THREE.Color(0x000), 1);
  gui_mesh.visible = true;
  
  if(!video.paused) {
    switchVideo();
  }
  // console.log(camera);
});

// XR end
renderer.xr.addEventListener( 'sessionend', function ( event ) {
  renderer.setClearColor(new THREE.Color(0x000), 0);
  /*
  // onWindowResize();
  camera.near = .1;
  camera.far = 1100;
  camera.position.set( 0, 0, 0 );
  camera.updateProjectionMatrix();
  */
  // console.log(camera);
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
  // controls.update();

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
