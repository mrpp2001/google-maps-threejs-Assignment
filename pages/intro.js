import React, { useState, useRef, useEffect } from "react";
import { Wrapper } from "@googlemaps/react-wrapper";
import {
  PerspectiveCamera,
  Scene,
  AmbientLight,
  WebGLRenderer,
  Matrix4,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const mapOptions = {
  mapId: process.env.NEXT_PUBLIC_MAP_ID,
  center: { lat: 43.661036, lng: -79.391277 },
  zoom: 20,
  disableDefaultUI: true,
  heading: 25,
  tilt: 25,
};

// Rendering Map
export default function App() {
  return (
    <Wrapper apiKey={process.env.NEXT_PUBLIC_MAP_API_KEY}>
      <MyMap />
    </Wrapper>
  );
}

function MyMap() {
  const overlayRef = useRef();  // Prevent Double reload or render
  const [map, setMap] = useState();
  const ref = useRef();

  useEffect(() => {
    if (!overlayRef.current) {
      const instance = new window.google.maps.Map(ref.current, mapOptions);
      setMap(instance);
      overlayRef.current = createOverlay(instance);
    }
  }, []);

  return <div ref={ref} id="map" />;
}

function createOverlay(map) {
  const overlay = new google.maps.WebGLOverlayView();
  let renderer, scene, camera, loader;

  // (it work only once) Overlay Setup in onADD and render 3D on canvas
  overlay.onAdd = () => {
    scene = new Scene();       //use to place object
    camera = new PerspectiveCamera();   // camera angle 
    const light = new AmbientLight(0xffffff, 0.9);   //lighting on map
    scene.add(light);


    // to load 3D scooter
    loader = new GLTFLoader();
    loader.loadAsync("/man_walking/scene.gltf").then((object) => {
      const group = object.scene; // select the model
      group.scale.setScalar(3); // size of model 
      group.rotation.set(Math.PI / 2, 0, 0);
      group.position.setZ(-120);
      scene.add(group); 
    });
  };

// (it work only once) we recive gl ifrom this to set up threeJs renderer
  overlay.onContextRestored = ({ gl }) => {
    renderer = new WebGLRenderer({
      canvas: gl.canvas,
      context: gl,
      ...gl.getContextAttributes(),
    });
    renderer.autoClear = false;

    // Animate map
    loader.manager.onLoad = () => {
      renderer.setAnimationLoop(() => {
        map.moveCamera({
          tilt: mapOptions.tilt,
          heading: mapOptions.heading,
          zoom: mapOptions.zoom,
        });

        if (mapOptions.tilt < 60) {
          mapOptions.tilt += 0.5;
        } else if (mapOptions.zoom < 20) {
          mapOptions.zoom += 0.05;
        } else if (mapOptions.heading < 125) {
          mapOptions.heading += 0.5;
        } else {
          renderer.setAnimationLoop(null);
        }
      });
    };
  };


  // it rerender 30 or 60 time when ever we move mouse
  // transformer help us to setup latitude and longitude on map
  overlay.onDraw = ({ transformer }) => {
    const matrix = transformer.fromLatLngAltitude({
      lat: mapOptions.center.lat,
      lng: mapOptions.center.lng,
      altitude: 120,
    });
    camera.projectionMatrix = new Matrix4().fromArray(matrix);

    overlay.requestRedraw();
    renderer.render(scene, camera);
    renderer.resetState();
  };

  overlay.setMap(map);

  return overlay;
}
