"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { SimulationResult } from "@/lib/marlin/types";

const COLORS = ["#4fd1c5", "#63b3ed", "#f6ad55", "#fc8181"];

export function TrajectoryView({ results }: { results: SimulationResult[] }) {
  return (
    <div className="trajectory-frame">
      <Canvas camera={{ position: [0, 0, 8.5], fov: 45 }}>
        <color attach="background" args={["#060b14"]} />
        <ambientLight intensity={0.8} />
        <Grid />
        {results.map((result, index) => (
          <TrajectoryLine
            key={result.vehicle.id}
            result={result}
            color={COLORS[index % COLORS.length]}
          />
        ))}
      </Canvas>
    </div>
  );
}

function Grid() {
  const lines = useMemo(() => {
    const material = new THREE.LineBasicMaterial({
      color: "#1f3a5f",
      transparent: true,
      opacity: 0.35
    });
    const items: JSX.Element[] = [];

    for (let x = -4; x <= 4; x += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -2.25, 0),
        new THREE.Vector3(x, 2.25, 0)
      ]);
      items.push(<primitive key={`v-${x}`} object={new THREE.Line(geometry, material)} />);
    }

    for (let y = -2; y <= 2; y += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-4.5, y, 0),
        new THREE.Vector3(4.5, y, 0)
      ]);
      items.push(<primitive key={`h-${y}`} object={new THREE.Line(geometry, material)} />);
    }

    return items;
  }, []);

  return <>{lines}</>;
}

function TrajectoryLine({ result, color }: { result: SimulationResult; color: string }) {
  const line = useMemo(() => {
    const downrangeMax = Math.max(...result.points.map((point) => point.downrangeM), 1);
    const altitudeMax = Math.max(...result.points.map((point) => point.altitudeM), 1);
    const points = result.points
      .filter((_, index) => index % 8 === 0)
      .map((point) => {
        const x = (point.downrangeM / downrangeMax) * 8 - 4;
        const y = (point.altitudeM / altitudeMax) * 3.8 - 1.9;
        return new THREE.Vector3(x, y, 0);
      });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, linewidth: 3 });

    return new THREE.Line(geometry, material);
  }, [color, result.points]);

  return <primitive object={line} />;
}
