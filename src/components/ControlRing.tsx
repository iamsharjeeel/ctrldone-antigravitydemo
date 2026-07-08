"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ScrollTrigger } from "@/lib/gsap";

function ParticleField({
  progressRef,
  particleCount,
}: {
  progressRef: React.RefObject<number>;
  particleCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const materialRef = useRef<THREE.PointsMaterial>(null!);
  const mouseRef = useRef({ x: 0, y: 0 });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Listen for mousemove to implement mouse parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const isMobile = window.innerWidth < 1024; // lg breakpoint is 1024px
      if (isMobile) {
        // Full width canvas on mobile
        mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      } else {
        // Right half canvas on desktop (lg:w-1/2)
        const relativeX = e.clientX - (window.innerWidth / 2);
        mouseRef.current.x = (relativeX / (window.innerWidth / 2)) * 2 - 1;
      }
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 1. Programmatically generate the CTRLDONE favicon badge texture
  const faviconTexture = useMemo(() => {
    if (typeof window === "undefined") return null;

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);

      // A. Draw lime circle in the center
      ctx.fillStyle = "#D6EE3C";
      ctx.beginPath();
      ctx.arc(64, 64, 40, 0, Math.PI * 2);
      ctx.fill();

      // B. Draw blue outer arc (partial ring)
      ctx.strokeStyle = "#5B6EF3";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(64, 64, 48, -Math.PI * 0.25, Math.PI * 1.5);
      ctx.stroke();

      // C. Draw dark checkmark in the center
      ctx.strokeStyle = "#1B2430";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(44, 64);
      ctx.lineTo(58, 78);
      ctx.lineTo(84, 44);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }, []);

  // Brand color palette for randomized particle mix
  const palette = useMemo(() => [
    new THREE.Color("#5B6EF3"), // Signal Blue
    new THREE.Color("#D6EE3C"), // Signal Lime
    new THREE.Color("#EDEEF2"), // Bone white
    new THREE.Color("#7C8494"), // Ash neutral
  ], []);

  // 2. Generate positions & colors for particles (100% Favicons)
  const [basePositions, targetPositions, colors] = useMemo(() => {
    const base = new Float32Array(particleCount * 3);
    const target = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // scattered sphere start
      const r = 4 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      base[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      base[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      base[i * 3 + 2] = r * Math.cos(phi);

      const isMobileSize = particleCount === 1000;
      const ringRatio = isMobileSize ? 1.0 : 0.85;

      // targets
      if (i < particleCount * ringRatio) {
        // Torus Ring
        const a = (i / (particleCount * ringRatio)) * Math.PI * 2;
        const ringR = 3.1 + (Math.random() - 0.5) * 0.15;
        target[i * 3] = Math.cos(a) * ringR;
        target[i * 3 + 1] = Math.sin(a) * ringR;
        target[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      } else {
        // Connected checkmark (no gap, connected at vertex)
        const t = Math.random();
        if (t < 0.35) {
          // Short leg: from (-1.1, 0.0) to (-0.3, -0.8)
          const pct = t / 0.35;
          target[i * 3] = -1.1 + pct * 0.8;
          target[i * 3 + 1] = 0.0 - pct * 0.8;
        } else {
          // Long leg: from (-0.3, -0.8) to (1.1, 0.7)
          const pct = (t - 0.35) / 0.65;
          target[i * 3] = -0.3 + pct * 1.4;
          target[i * 3 + 1] = -0.8 + pct * 1.5;
        }
        target[i * 3 + 2] = 0;
      }

      // Assign random color from brand palette
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return [base, target, colors];
  }, [particleCount, palette]);

  useFrame((state) => {
    let p = progressRef.current ?? 0;

    if (prefersReducedMotion) {
      p = 1.0;
    }

    const easedP = THREE.MathUtils.smoothstep(p, 0, 1);
    const { width, height } = state.viewport;

    // Get the mouse coordinates in local space relative to the group
    let mx = 0;
    let my = 0;
    if (groupRef.current) {
      mx = (mouseRef.current.x * (width / 2) - groupRef.current.position.x) / groupRef.current.scale.x;
      my = (mouseRef.current.y * (height / 2) - groupRef.current.position.y) / groupRef.current.scale.y;
    }

    // Update positions for particles (with repulsion)
    if (geoRef.current) {
      const pos = geoRef.current.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        let px = THREE.MathUtils.lerp(basePositions[i * 3], targetPositions[i * 3], easedP);
        let py = THREE.MathUtils.lerp(basePositions[i * 3 + 1], targetPositions[i * 3 + 1], easedP);
        const pz = THREE.MathUtils.lerp(basePositions[i * 3 + 2], targetPositions[i * 3 + 2], easedP);

        // Repel from cursor if assembling/assembled (p > 0.3)
        if (p > 0.3 && !prefersReducedMotion) {
          const dx = px - mx;
          const dy = py - my;
          const distSq = dx * dx + dy * dy;
          const maxDist = 1.2;
          if (distSq < maxDist * maxDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            const force = (maxDist - dist) * 0.45;
            px += (dx / dist) * force;
            py += (dy / dist) * force;
          }
        }

        pos[i * 3] = px;
        pos[i * 3 + 1] = py;
        pos[i * 3 + 2] = pz;
      }
      geoRef.current.attributes.position.needsUpdate = true;
    }

    // Colors mapping: Transition material tint multiplier from ash (#7C8494) to white (#ffffff).
    // This allows the particles to start gray/neutral and gradually colorize into the mixed palette.
    const colorProgress = Math.max(0, Math.min(1, (p - 0.7) / 0.3));
    const ashColor = new THREE.Color("#7C8494");
    const whiteColor = new THREE.Color("#ffffff");
    const currentColor = new THREE.Color().lerpColors(ashColor, whiteColor, colorProgress);

    if (materialRef.current) {
      materialRef.current.color.copy(currentColor);
    }

    // Group-level transform (scaling, rotation, parallax)
    if (groupRef.current) {
      const heroX = 0; // Centered in the right-half canvas
      const heroY = 0;

      // Make it half in size
      const scaleMultiplier = width < 6 ? 0.4 : 0.5;
      groupRef.current.scale.setScalar(scaleMultiplier);

      const targetParallaxX = mouseRef.current.x * 0.25;
      const targetParallaxY = mouseRef.current.y * 0.25;

      groupRef.current.position.x = heroX + targetParallaxX;
      groupRef.current.position.y = heroY + targetParallaxY;
      groupRef.current.position.z = 0;

      // Group rotation
      if (!prefersReducedMotion) {
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.06;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {faviconTexture && (
        <points>
          <bufferGeometry ref={geoRef}>
            <bufferAttribute attach="attributes-position" args={[basePositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={materialRef}
            size={particleCount === 1000 ? 0.08 : 0.05}
            map={faviconTexture}
            vertexColors={true}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            alphaTest={0.005}
          />
        </points>
      )}
    </group>
  );
}

export default function ControlRing() {
  const [particleCount, setParticleCount] = useState(2500);
  const progressRef = useRef(0);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setParticleCount(1000);
    }

    const convergeTrigger = ScrollTrigger.create({
      trigger: "#hero",
      start: "top top",
      end: "bottom+=100% top",
      scrub: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });

    return () => {
      convergeTrigger.kill();
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.5} />
        <ParticleField
          progressRef={progressRef}
          particleCount={particleCount}
        />
      </Canvas>
    </div>
  );
}
