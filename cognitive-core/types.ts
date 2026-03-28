import * as THREE from 'three';

export interface ParticleData {
  wave: number;
  startAngle: number;
  startRadius: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  offset: number;
  spiralSpeed: number;
  converged: boolean;
}

export interface AgentData {
  name: string;
  angle: number;
  radius: number;
  innerGraph: THREE.Mesh;
}

export interface ActConfig {
  sphereY: number;
  sphereScale: number;
  sphereRotationY: number;
  sphereRotationX?: number;
  graphRotationY?: number;
}