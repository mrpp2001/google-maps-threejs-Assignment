import React, { useState, useEffect, useRef } from "react";
import { Wrapper } from "@googlemaps/react-wrapper";
import ThreejsOverlayView from "@ubilabs/threejs-overlay-view";
import { CatmullRomCurve3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import fetchDirections from "../src/fetchDirections";
import * as THREE from "three";


const mapOptions = {
  mapId: process.env.NEXT_PUBLIC_MAP_ID,
  center: { lat: 43.66293, lng: -79.39314 },
  zoom: 18,
  // disableDefaultUI: true,
  heading: 25,
  tilt: 60,
};

// render map
export default function App() {
  return (
    <Wrapper apiKey={process.env.NEXT_PUBLIC_MAP_API_KEY}>
      <MyMap />
    </Wrapper>
  );
}

// Creating Map
function MyMap() {
  const [route, setRoute] = useState(null); // Drawing root in between two points
  const [map, setMap] = useState();
  const ref = useRef();

  // It will run after the first render
  useEffect(() => {
    setMap(new window.google.maps.Map(ref.current, mapOptions));
  }, []);

  return (
    <>
      <div ref={ref} id="map" />
      {map && <Directions setRoute={setRoute} />}
      {map && route && <Animate map={map} route={route} />}
    </>
  );
}

async function loadModel() {
  const loader = new GLTFLoader();
  const object = await loader.loadAsync("/man_walking/Punk.gltf");
  const group = object.scene;
  group.scale.setScalar(8);

  // Find the animation clip by name
  const mixer = new THREE.AnimationMixer(group);
  let walkAction = null;
  object.animations.forEach((clip, index) => {
    if (clip.name.toLowerCase().includes('walk')) {
      walkAction = mixer.clipAction(clip);
    }
  });

  if (!walkAction) {
    console.error("Walking animation found.");
  } else {
    walkAction.play();
  }

 return { group, mixer }; // Return both the group and the mixer
}

//Animation
const ANIMATION_MS = 50000;
const FRONT_VECTOR = new Vector3(0, -1, 0);

function Animate({ route, map }) {
  const overlayRef = useRef();
  const trackRef = useRef();
  const humanRef = useRef();

  useEffect(() => {
    map.setCenter(route[Math.floor(route.length / 2)], 17);

    if (!overlayRef.current) {
      overlayRef.current = new ThreejsOverlayView(mapOptions.center);
      overlayRef.current.setMap(map);
    }

    const scene = overlayRef.current.getScene();
    const points = route.map((p) => overlayRef.current.latLngAltToVector3(p));
    const curve = new CatmullRomCurve3(points); // Line of path

    //Track
    if (trackRef.current) {
      scene.remove(trackRef.current);
    }
    trackRef.current = createTrackFromCurve(curve);
    scene.add(trackRef.current);

    //Model
    loadModel().then(({ group, mixer }) => {
      if (humanRef.current) {
        scene.remove(humanRef.current);
      }
      humanRef.current = group;
      scene.add(humanRef.current);

      // Update the animation on each frame
      const clock = new THREE.Clock();
      const animateModel = () => {
        requestAnimationFrame(animateModel);

        const delta = clock.getDelta();
        if (mixer) {
          mixer.update(delta);
        }

        overlayRef.current.requestRedraw();
      };
      animateModel();
    });

    // every time it render
    overlayRef.current.update = () => {
      trackRef.current.material.resolution.copy(
        overlayRef.current.getViewportSize()
      );

      // Human Animation
      if (humanRef.current) {
        const progress = (performance.now() % ANIMATION_MS) / ANIMATION_MS;
        curve.getPointAt(progress, humanRef.current.position);
        humanRef.current.quaternion.setFromUnitVectors(
          FRONT_VECTOR,
          curve.getTangentAt(progress)
        );
        humanRef.current.rotateX(Math.PI / 2);
      }

      overlayRef.current.requestRedraw();
    };

    return () => {
      scene.remove(trackRef.current);
      scene.remove(humanRef.current);
    };

    
  }, [route]);
}

function createTrackFromCurve(curve) {
  const points = curve.getSpacedPoints(curve.points.length * 4);
  const positions = points.map((point) => point.toArray()).flat();

  return new Line2(
    new LineGeometry().setPositions(positions),
    new LineMaterial({
      color: '#ff0000',
      linewidth: 10, 
    })
  );
}



// Directions
function Directions({ setRoute }) {
  const [origin] = useState("SPG Media & Video production company1 Yonge St Toronto");
  const [destination] = useState("theScore 125 Queens Quay E Toronto");
  
  // It will run after change of destination
  useEffect(() => {
    fetchDirections(origin, destination, setRoute);
  }, [origin, destination]);

  return (
    <div className="directions">
      <h2>Directions</h2>
      <h3>Origin</h3>
      <p>{origin}</p>
      <h3>Destination</h3>
      <p>{destination}</p>
    </div>
  );
}
