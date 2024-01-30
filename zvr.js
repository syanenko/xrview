import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';
import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { GUI } from 'three/addons/libs/lil-gui.esm.min.js';

import { MathUtils } from 'three';
import Stats from 'three/addons/libs/stats.module.js';

// TODO: Change to local: 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

const intersected = [];
const tempMatrix = new THREE.Matrix4();
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

let container, stats, loader;
let camera, scene, renderer;
let textureLoader;
var gui, gui_mesh;
var param_changed = false;

let beam;
const beam_color = 0xffffff;
const beam_hilight_color = 0x222222;

let controls;
let controller;
let directionalLight, pointLight, ambientLight;

let model;

// GUI
const params = {
  scale:   1.0,
  x: 0.0,
  y: 0.0,
  z: 0.0
};


init();
animate();

function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera( 85, window.innerWidth / window.innerHeight, 0.01, 10000 );
  camera.position.z = 1; 
  scene.add( camera );

  // Lights
  ambientLight = new THREE.AmbientLight( 0xffffff );
  scene.add( ambientLight );

  pointLight = new THREE.PointLight( 0xffffff, 30 );
  pointLight.position.set( 0, 0, 6 );

  scene.add( pointLight );

  directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
  directionalLight.position.set( 1, - 0.5, - 1 );
  scene.add( directionalLight );

  // Controller lighting
  const light = new THREE.PointLight( 0xffffff, 2, 1, 0);
  light.position.set( 0, 0, 0 );
  scene.add( light );

  // Textures
  textureLoader = new THREE.TextureLoader();
  const diffuseMap = textureLoader.load( 'data/models/sea_star/see_star.bmp' );
  diffuseMap.colorSpace = THREE.SRGBColorSpace;

  // const specularMap = textureLoader.load( 'data/models/sea_star/sea_star_spec.jpg' );
  const normalMap = textureLoader.load( 'data/models/sea_star/sea_star_nm.bmp' );

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
    normalScale: new THREE.Vector2( 2.1, 2.1 )
  } );
  material.side = THREE.DoubleSide;

  // Object
/*
  loader = new OBJLoader();
  loader.load( 'data/models/sea_star/see_star.obj', function ( object ) {
    const geometry = object.children[ 0 ].geometry;
    model = new THREE.Mesh( geometry, material );
    model.translateZ(-6);
    scene.add( model );
  } );
*/
  // DEBUG: Test object
  const geometry = new THREE.CylinderGeometry( 0.05, 0.05, 0.1, 64, 1);
  const mat = new THREE.MeshPhongMaterial( {color: 0x00fa00, transparent:false, side: THREE.DoubleSide } );
  model = new THREE.Mesh(geometry, mat);
  model.translateZ(-0.4);
  scene.add(model);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  
  // XR
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType( 'local' );
  renderer.xr.setFramebufferScaleFactor( 4.0 );
  container.appendChild( renderer.domElement );

  // Orbit controls 
  initControls();

  // GUI
  gui = new GUI( {width: 350, title:"Settings", closeFolders:true} ); // Check 'closeFolders' - not working
  gui.add( params, 'scale', 0.5, 5.0, 0.01 ).name( 'Scale' ).onChange(onScale);
  gui.add( params, 'x', -0.7, 0.7, 0.01 ).name( 'X' ).onChange(onX);
  gui.add( params, 'y', -0.7, 0.7, 0.01 ).name( 'Y' ).onChange(onY);
  gui.add( params, 'z', -0.7, 0.7, 0.01 ).name( 'Z' ).onChange(onZ);
  gui.add( gui.reset(), 'reset' ).name( 'Reset' ).onChange(()=>{ controls.reset(); });
  
  const group = new InteractiveGroup( renderer, camera );
  scene.add( group );

  // GUI position
  gui_mesh = new HTMLMesh( gui.domElement );
  gui_mesh.rotation.x = -Math.PI / 9;
  gui_mesh.position.y = -0.36;
  gui_mesh.position.z = -0.6;
  group.add( gui_mesh );
  gui_mesh.visible = false;

  initController();

  /* Stats 
  stats = new Stats();
  container.appendChild( stats.dom );
  */
  document.body.appendChild( VRButton.createButton( renderer ) );
}

// Init controller
function initControls()
{
  // Controls
  controls = new OrbitControls( camera, renderer.domElement );
  // DEBUG !
  // controls.target.set( 0, 0, -6 );
  // Target test
  controls.target.set( params.x, params.y, params.z );

  controls.update();
  controls.enablePan = true;
  controls.enableDamping = true;
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
  model.scale.setScalar( params.scale );
  param_changed = true;
}

function onX() {
  model.position.setX( params.x );
  param_changed = true;
}

function onY() {
  model.position.setY( params.y );
  param_changed = true;
}

function onZ() {
  model.position.setZ( params.z );
  param_changed = true;
}

// XR start 
renderer.xr.addEventListener( 'sessionstart', function ( event ) {
  renderer.setClearColor(new THREE.Color(0x000), 1);
} );

// XR end
renderer.xr.addEventListener( 'sessionend', function ( event ) {
  renderer.setClearColor(new THREE.Color(0x000), 0);
  gui_mesh.visible = false;
});

// Resizw
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
  // stats.update();
  controls.update();
  renderer.render( scene, camera );
}
