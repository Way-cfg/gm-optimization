/* eslint-disable react/no-unknown-property */
import { useRef, useState } from "react";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBoxGeometry, useTexture } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";
import appLogo from "../assets/applogo.png";

extend({ MeshLineGeometry, MeshLineMaterial });

function createLanyardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#141619";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#FF5500";
  ctx.lineWidth = 14;
  for (let i = -128; i < 256; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 64, 128);
    ctx.stroke();
  }
  ctx.strokeStyle = "#FF7733";
  ctx.lineWidth = 5;
  for (let i = -128; i < 256; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i + 9, 0);
    ctx.lineTo(i + 73, 128);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function Band() {
  const band = useRef<any>(null);
  const fixed = useRef<any>(null);
  const j1 = useRef<any>(null);
  const j2 = useRef<any>(null);
  const j3 = useRef<any>(null);
  const card = useRef<any>(null);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const segmentProps: any = {
    type: "dynamic",
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  };

  const [lanyardTexture] = useState(() => createLanyardTexture());

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );
  const [dragged, drag] = useState<false | THREE.Vector3>(false);

  useRopeJoint(fixed, j1, [
    [0, 0, 0],
    [0, 0, 0],
    1,
  ]);
  useRopeJoint(j1, j2, [
    [0, 0, 0],
    [0, 0, 0],
    1,
  ]);
  useRopeJoint(j2, j3, [
    [0, 0, 0],
    [0, 0, 0],
    1,
  ]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.45, 0],
  ]);

  useFrame((state, delta) => {
    if (dragged && typeof dragged !== "boolean") {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current) {
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped)
          ref.current.lerped = new THREE.Vector3().copy(
            ref.current.translation()
          );
        const clampedDistance = Math.max(
          0.1,
          Math.min(1, ref.current.lerped.distanceTo(ref.current.translation()))
        );
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (0 + clampedDistance * (50 - 0))
        );
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(32));
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({
        x: ang.x,
        y: ang.y - rot.y * 0.25,
        z: ang.z,
      });
    }
  });

  curve.curveType = "chordal";

  const logoTexture = useTexture(appLogo);
  const metalMat = new THREE.MeshPhysicalMaterial({
    color: 0x888888,
    roughness: 0.3,
    metalness: 0.6,
  });
  const cardWidth = 1.6;
  const cardHeight = 2.25;
  const cardDepth = 0.04;

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody
          position={[0.5, 0, 0]}
          ref={j1}
          {...segmentProps}
          type="dynamic"
        >
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[1, 0, 0]}
          ref={j2}
          {...segmentProps}
          type="dynamic"
        >
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[1.5, 0, 0]}
          ref={j3}
          {...segmentProps}
          type="dynamic"
        >
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => {
              document.body.style.cursor = dragged ? "grabbing" : "grab";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
            onPointerDown={(e: any) => {
              e.target.setPointerCapture(e.pointerId);
              drag(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation()))
              );
            }}
            onPointerUp={(e: any) => {
              e.target.releasePointerCapture(e.pointerId);
              drag(false);
            }}
          >
            <mesh>
              <RoundedBoxGeometry
                args={[cardWidth, cardHeight, cardDepth]}
                radius={0.1}
                smoothness={4}
              />
              <meshPhysicalMaterial
                color="#222222"
                roughness={0.85}
                metalness={0.1}
              />
            </mesh>
            <mesh position={[0, 0, cardDepth / 2 + 0.001]}>
              <planeGeometry args={[cardWidth * 0.7, cardHeight * 0.5]} />
              <meshBasicMaterial map={logoTexture} transparent />
            </mesh>
            <mesh
              position={[0, 0, -(cardDepth / 2 + 0.001)]}
              rotation={[0, Math.PI, 0]}
            >
              <planeGeometry args={[cardWidth * 0.7, cardHeight * 0.5]} />
              <meshBasicMaterial
                map={logoTexture}
                transparent
                opacity={0.6}
              />
            </mesh>
            <mesh position={[0, 0.95, 0]}>
              <boxGeometry args={[0.25, 0.35, cardDepth + 0.01]} />
              <meshPhysicalMaterial {...metalMat} />
            </mesh>
            <mesh position={[0, 0.82, 0]}>
              <boxGeometry args={[0.04, 0.18, cardDepth + 0.02]} />
              <meshPhysicalMaterial {...metalMat} />
            </mesh>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={[1000, 1000]}
          useMap
          map={lanyardTexture}
          repeat={[-4, 1]}
          lineWidth={1}
        />
      </mesh>
    </>
  );
}

export default function Lanyard() {
  const [isMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 20 }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: true }}
        onCreated={({ gl }) =>
          gl.setClearColor(new THREE.Color(0x000000), 0)
        }
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={[0, -40, 0]} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Band />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="white"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="#FF5500"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}
