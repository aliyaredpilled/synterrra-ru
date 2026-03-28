
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TITLES, LOOP_DURATION, ACT_1_END, ACT_2_END, AGENT_NAMES } from '../constants';
import { ParticleData } from '../types';

const CognitiveExperience: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const finalTextRef = useRef<HTMLDivElement>(null);
  
  // Refs for labels to update position without React re-renders
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // UI State
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // ============================================
    // SCENE SETUP
    // ============================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Reduced FOV from 60 to 50 to make objects appear larger/closer
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    // ADDED: PointLight for crystal highlights
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // ============================================
    // OBJECT CREATION
    // ============================================

    // --- Act 1: Rings & Particles ---
    const rings: THREE.LineLoop[] = [];
    const ringCount = 5;
    const ringYPositions: number[] = [];

    for (let i = 0; i < ringCount; i++) {
      const ringY = -4 + i * 1.8;
      ringYPositions.push(ringY);

      const points = new THREE.Path().absarc(0, 0, 1.8 - i * 0.12, 0, Math.PI * 2).getPoints(64);
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.4 + i * 0.1 })
      );
      ring.position.y = ringY;
      ring.rotation.x = Math.PI / 2;
      ring.userData = { baseOpacity: 0.4 + i * 0.1, baseRadius: 1.8 - i * 0.12 };
      rings.push(ring);
      scene.add(ring);

      const glowRing = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(new THREE.Path().absarc(0, 0, 1.5 - i * 0.1, 0, Math.PI * 2).getPoints(64)),
        new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0 })
      );
      glowRing.position.y = ringY;
      glowRing.rotation.x = Math.PI / 2;
      ring.userData.glow = glowRing;
      scene.add(glowRing);
    }

    // Sphere target
    const sphereGeometry = new THREE.IcosahedronGeometry(1.5, 2);
    const spherePositions = sphereGeometry.attributes.position.array;
    const sphereVertexCount = spherePositions.length / 3;

    // Particles
    const waveCount = 6;
    const particlesPerWave = 150;
    const totalParticles = waveCount * particlesPerWave;
    const particlePositions = new Float32Array(totalParticles * 3);
    const particleData: ParticleData[] = [];

    for (let wave = 0; wave < waveCount; wave++) {
      for (let i = 0; i < particlesPerWave; i++) {
        const idx = wave * particlesPerWave + i;
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 2;
        const startY = -5 - Math.random() * 2;

        particlePositions[idx * 3] = Math.cos(angle) * radius;
        particlePositions[idx * 3 + 1] = startY;
        particlePositions[idx * 3 + 2] = Math.sin(angle) * radius;

        const sphereIdx = idx % sphereVertexCount;
        particleData.push({
          wave,
          startAngle: angle,
          startRadius: radius,
          startY,
          targetX: spherePositions[sphereIdx * 3],
          targetY: spherePositions[sphereIdx * 3 + 1] + 6,
          targetZ: spherePositions[sphereIdx * 3 + 2],
          offset: Math.random() * 0.3,
          spiralSpeed: 2 + Math.random() * 2,
          converged: false
        });
      }
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterialWaves = new THREE.PointsMaterial({ color: 0x333333, size: 0.04, transparent: true, opacity: 0 });
    const particles = new THREE.Points(particlesGeometry, particleMaterialWaves);
    scene.add(particles);

    const wireframeSphere = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.5, 1)),
      new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0 })
    );
    wireframeSphere.position.y = 6;
    scene.add(wireframeSphere);

    // --- Act 2: Graph ---
    const graphNodes: THREE.Mesh[] = [];
    const graphEdges: THREE.Line[] = [];
    const graphGroup = new THREE.Group();
    graphGroup.visible = false;
    scene.add(graphGroup);

    const nodePositions = [
      [0, 0, 0], [3, 2, 0], [3, -2, 0], [-3, 2, 0], [-3, -2, 0],
      [0, 3, 2], [0, 3, -2], [0, -3, 2], [0, -3, -2],
      [2, 0, 3], [-2, 0, 3], [2, 0, -3], [-2, 0, -3],
      [4, 4, 0], [-4, 4, 0], [4, -4, 0], [-4, -4, 0],
      [0, 4, 4], [0, -4, 4], [0, 4, -4], [0, -4, -4]
    ];
    const edgeConnections = [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10],
      [1, 5], [1, 9], [1, 13], [2, 7], [2, 9], [2, 15], [3, 5], [3, 10], [3, 14],
      [4, 7], [4, 10], [4, 16], [5, 6], [5, 17], [6, 19], [7, 8], [7, 18], [8, 20],
      [9, 11], [10, 12], [11, 12], [13, 14], [15, 16], [17, 18], [19, 20]
    ];

    nodePositions.forEach((pos, i) => {
      const geometry = i === 0 ? new THREE.IcosahedronGeometry(0.4, 1) : new THREE.SphereGeometry(0.25, 16, 16);
      const node = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0 }));
      node.position.set(pos[0], pos[1], pos[2]);
      graphNodes.push(node);
      if (i !== 0) graphGroup.add(node);
    });

    edgeConnections.forEach(([i, j]) => {
      const edge = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...nodePositions[i]), new THREE.Vector3(...nodePositions[j])]),
        new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0 })
      );
      graphEdges.push(edge);
      graphGroup.add(edge);
    });

    // --- Act 3: Multi-Agent ---
    const agentGroup = new THREE.Group();
    agentGroup.visible = false;
    scene.add(agentGroup);
    const agents: THREE.Group[] = [];
    const dataFlows: THREE.Line[] = [];
    const flowParticles: THREE.Mesh[] = [];

    const agentStartPositions = nodePositions.slice(0, 13);
    const agentEndPositions = [
        [0, 0, 0], [5, 3, 0], [5, -3, 0], [-5, 3, 0], [-5, -3, 0],
        [0, 5, 3], [0, 5, -3], [0, -5, 3], [0, -5, -3],
        [3, 0, 5], [-3, 0, 5], [3, 0, -5], [-3, 0, -5]
    ];

    agentStartPositions.forEach((startPos, i) => {
        const aura = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.55, 32), new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0, side: THREE.DoubleSide }));
        const core = new THREE.Mesh(i === 0 ? new THREE.IcosahedronGeometry(0.35, 1) : new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0 }));
        const agent = new THREE.Group();
        agent.add(aura);
        agent.add(core);
        agent.position.set(startPos[0], startPos[1], startPos[2]);
        agent.userData = { 
            aura, core, 
            pulsePhase: Math.random() * Math.PI * 2, 
            startPos: new THREE.Vector3(...startPos), 
            endPos: new THREE.Vector3(...agentEndPositions[i]) 
        };
        agents.push(agent);
        agentGroup.add(agent);
    });

    const flowConnections = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 5], [2, 7], [3, 6], [4, 8], [5, 9], [6, 10], [7, 11], [8, 12], [9, 10], [11, 12]];

    flowConnections.forEach(([i, j]) => {
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(...agentEndPositions[i]),
            new THREE.Vector3(
                (agentEndPositions[i][0] + agentEndPositions[j][0]) / 2 + (Math.random() - 0.5) * 2,
                (agentEndPositions[i][1] + agentEndPositions[j][1]) / 2 + (Math.random() - 0.5) * 2,
                (agentEndPositions[i][2] + agentEndPositions[j][2]) / 2 + (Math.random() - 0.5) * 2
            ),
            new THREE.Vector3(...agentEndPositions[j])
        );
        const flow = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(50)), new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0 }));
        flow.userData = { curve };
        dataFlows.push(flow);
        agentGroup.add(flow);

        const particle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0 }));
        particle.userData = { curve, t: Math.random(), speed: 0.002 + Math.random() * 0.003 };
        flowParticles.push(particle);
        agentGroup.add(particle);
    });

    // --- Act 5: Supervisor Cluster ---
    const clusterGroup = new THREE.Group();
    clusterGroup.visible = false;
    scene.add(clusterGroup);

    // UPDATED: Darker color and rougher material for better highlights
    const supervisor = new THREE.Mesh(
      new THREE.OctahedronGeometry(3, 0), 
      new THREE.MeshStandardMaterial({ 
        color: 0x050505, 
        metalness: 0.9, 
        roughness: 0.3, 
        transparent: true, 
        opacity: 0 
      })
    );
    clusterGroup.add(supervisor);

    const clusterAgents: THREE.Mesh[] = [];
    const supervisorBeams: THREE.Line[] = [];

    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const radius = 14;
        const agentShell = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0 }));
        agentShell.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        
        const innerGraph = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0, wireframe: true }));
        agentShell.add(innerGraph);
        agentShell.userData = { name: AGENT_NAMES[i], angle, radius, innerGraph };
        clusterAgents.push(agentShell);
        clusterGroup.add(agentShell);

        const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), agentShell.position.clone()]), new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0 }));
        supervisorBeams.push(beam);
        clusterGroup.add(beam);
    }

    // --- Act 6: Hive Mind ---
    const hiveGroup = new THREE.Group();
    hiveGroup.visible = false;
    scene.add(hiveGroup);
    const clusters: THREE.Group[] = [];
    const globalLines: THREE.Line[] = [];

    for (let i = 0; i < 35; i++) {
        const miniCluster = new THREE.Group();
        miniCluster.add(new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0 })));
        for (let j = 0; j < 5; j++) {
            const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0 }));
            const a = (j / 5) * Math.PI * 2;
            m.position.set(Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5);
            miniCluster.add(m);
        }
        const spiralAngle = (i / 35) * Math.PI * 5;
        const spiralRadius = 35 + i * 5;
        miniCluster.position.set(Math.cos(spiralAngle) * spiralRadius, (Math.random() - 0.5) * 25, Math.sin(spiralAngle) * spiralRadius);
        miniCluster.userData = { rotSpeed: 0.0003 + Math.random() * 0.0007 };
        clusters.push(miniCluster);
        hiveGroup.add(miniCluster);
    }

    for (let i = 0; i < clusters.length - 1; i++) {
        if (Math.random() > 0.5) {
            const next = i + 1 + Math.floor(Math.random() * 3);
            if (next < clusters.length) {
                const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([clusters[i].position.clone(), clusters[next].position.clone()]), new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0 }));
                globalLines.push(line);
                hiveGroup.add(line);
            }
        }
    }


    // ============================================
    // ANIMATION HELPERS
    // ============================================
    function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }
    function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    // ============================================
    // LOOP STATE
    // ============================================
    let progress = 0;
    const clock = new THREE.Clock();

    const updateAct1 = (localProgress: number) => {
        const time = Date.now() * 0.001;
        const positions = particlesGeometry.attributes.position.array as Float32Array;

        for (let i = 0; i < totalParticles; i++) {
            const data = particleData[i];
            const pProgress = Math.max(0, Math.min(1, (localProgress - data.wave * 0.03 - data.offset * 0.02) * 3));
            const pathY = data.startY + pProgress * (6 - data.startY);
            let compressionFactor = 1;
            let nearRing = -1;

            for (let r = 0; r < ringCount; r++) {
                if (Math.abs(pathY - ringYPositions[r]) < 0.8) {
                    nearRing = r;
                    compressionFactor = 1 - (1 - Math.abs(pathY - ringYPositions[r]) / 0.8) * 0.6;
                }
            }

            const spiralAngle = data.startAngle + pProgress * Math.PI * data.spiralSpeed;
            const baseRadius = data.startRadius * (1 - pProgress * 0.5) * compressionFactor;
            
            let x = Math.cos(spiralAngle) * baseRadius;
            let y = pathY;
            let z = Math.sin(spiralAngle) * baseRadius;

            if (pathY > ringYPositions[ringCount - 1]) {
                const cf = Math.pow((pathY - ringYPositions[ringCount - 1]) / (6 - ringYPositions[ringCount - 1]), 0.8);
                x = x * (1 - cf) + data.targetX * cf;
                y = y * (1 - cf) + data.targetY * cf;
                z = z * (1 - cf) + data.targetZ * cf;
            }

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            if (nearRing >= 0 && pProgress > 0 && pProgress < 1) {
                const glow = rings[nearRing].userData.glow;
                glow.material.opacity = Math.max(glow.material.opacity, 0.5);
            }
        }
        particlesGeometry.attributes.position.needsUpdate = true;

        rings.forEach((ring, i) => {
            ring.scale.setScalar(1 + Math.sin(time * 2 + i) * 0.02);
            ring.userData.glow.material.opacity *= 0.95;
            if (localProgress > 0.8) {
                const fade = (localProgress - 0.8) / 0.2;
                ring.material.opacity = ring.userData.baseOpacity * (1 - fade);
                ring.userData.glow.material.opacity *= (1 - fade);
            }
        });

        if (localProgress >= 0.52) {
            wireframeSphere.material.opacity = 1;
            particleMaterialWaves.opacity = 0;
        } else if (localProgress > 0.02) {
            wireframeSphere.material.opacity = 0;
            particleMaterialWaves.opacity = Math.min(1, (localProgress - 0.02) / 0.1);
        } else {
            wireframeSphere.material.opacity = 0;
            particleMaterialWaves.opacity = 0;
        }

        wireframeSphere.position.y = ACT_1_END.sphereY;
        wireframeSphere.scale.setScalar(ACT_1_END.sphereScale);
        
        // FIXED: Time-based rotation for continuity
        wireframeSphere.rotation.y = time * 0.2;
        wireframeSphere.rotation.x = Math.sin(localProgress * Math.PI) * 0.1;
    };

    const updateAct2 = (localProgress: number) => {
        graphGroup.visible = true;
        particleMaterialWaves.opacity = 0;
        rings.forEach(r => r.material.opacity = Math.max(0, r.material.opacity - 0.05));

        wireframeSphere.position.y = ACT_1_END.sphereY + (ACT_2_END.sphereY - ACT_1_END.sphereY) * localProgress;
        wireframeSphere.scale.setScalar(ACT_1_END.sphereScale + (ACT_2_END.sphereScale - ACT_1_END.sphereScale) * localProgress);
        wireframeSphere.material.opacity = 1;
        
        // FIXED: Time-based rotation for continuity
        const time = Date.now() * 0.001;
        wireframeSphere.rotation.y = time * 0.2;
        wireframeSphere.rotation.x = (ACT_1_END.sphereRotationX || 0) * (1 - localProgress);

        graphNodes.forEach((node, i) => {
            if (i === 0) return;
            const p = Math.max(0, Math.min(1, (localProgress - i * 0.03) * 2));
            node.material.opacity = p;
            node.scale.setScalar(p);
        });
        graphEdges.forEach((edge, i) => {
             edge.material.opacity = Math.max(0, Math.min(1, (localProgress - 0.2 - i * 0.02) * 2)) * 0.6;
        });
        
        // FIXED: Time-based rotation
        graphGroup.rotation.y = time * 0.1;
    };

    const updateAct3 = (localProgress: number) => {
        agentGroup.visible = true;
        wireframeSphere.position.y = ACT_2_END.sphereY;
        wireframeSphere.scale.setScalar(ACT_2_END.sphereScale);
        wireframeSphere.material.opacity = 1 - localProgress;

        graphNodes.forEach((node, i) => { if (i !== 0) node.material.opacity = Math.max(0, 1 - Math.min(1, localProgress * 1.5)); });
        graphEdges.forEach(edge => edge.material.opacity = Math.max(0, 0.6 - Math.min(1, localProgress * 2.5) * 0.6));

        // FIXED: Time-based rotation
        const time = Date.now() * 0.001;
        graphGroup.rotation.y = time * 0.1;
        agentGroup.rotation.y = time * 0.1;

        agents.forEach((agent, i) => {
            const p = Math.max(0, Math.min(1, (localProgress - i * 0.03) * 1.5));
            agent.position.lerpVectors(agent.userData.startPos, agent.userData.endPos, p);
            agent.userData.core.material.opacity = p;
            const auraP = Math.max(0, (p - 0.3) / 0.7);
            agent.userData.aura.material.opacity = auraP * 0.5;
            agent.userData.aura.scale.setScalar((Math.sin(Date.now() * 0.003 + agent.userData.pulsePhase) * 0.1 + 1) * auraP);
            agent.userData.aura.lookAt(camera.position);
        });

        dataFlows.forEach((flow, i) => flow.material.opacity = Math.max(0, Math.min(1, (localProgress - 0.3 - i * 0.03) * 2)) * 0.4);
        flowParticles.forEach((p) => {
            if (localProgress > 0.4) {
                p.material.opacity = Math.min(1, (localProgress - 0.4) * 3);
                p.userData.t += p.userData.speed;
                if (p.userData.t > 1) p.userData.t = 0;
                p.position.copy(p.userData.curve.getPoint(p.userData.t));
            }
        });
    };

    const updateAct4 = (localProgress: number) => {
        agentGroup.visible = true;
        clusterGroup.visible = true;
        
        clusterAgents.forEach(a => {
            a.material.opacity = 0;
            if (a.userData.innerGraph) a.userData.innerGraph.material.opacity = 0;
        });
        supervisorBeams.forEach(b => b.material.opacity = 0);

        const smooth = easeInOutCubic(localProgress);
        const convergeEased = easeOutQuart(Math.min(1, smooth / 0.6));
        const time = Date.now() * 0.001;

        clusterGroup.rotation.y = 0;

        agents.forEach(agent => {
            agent.position.lerpVectors(agent.userData.endPos, new THREE.Vector3(0,0,0), convergeEased);
            agent.userData.core.material.opacity = 1 - convergeEased * 0.8;
            agent.userData.aura.material.opacity = 0.5 * (1 - convergeEased);
            agent.userData.core.scale.setScalar(1 - convergeEased * 0.7);
        });
        
        dataFlows.forEach(f => f.material.opacity = 0.4 * (1 - convergeEased));
        flowParticles.forEach(p => p.material.opacity = 1 - convergeEased);

        const crystalPhase = Math.max(0, (smooth - 0.5) / 0.5);
        const crystalEased = easeOutQuart(crystalPhase);

        if (crystalPhase > 0) agentGroup.visible = false;
        
        supervisor.material.opacity = crystalEased * 0.95;
        supervisor.scale.setScalar(crystalEased * 1.2);
        
        supervisor.rotation.y = time * 0.08;
        supervisor.rotation.x = Math.sin(time * 0.5) * 0.1;
    };

    const updateAct5 = (localProgress: number) => {
        clusterGroup.visible = true;
        agentGroup.visible = false;
        const smooth = easeInOutCubic(localProgress);
        const time = Date.now() * 0.001;

        supervisor.material.opacity = 0.95;
        supervisor.scale.setScalar(1.2);
        
        supervisor.rotation.y = time * 0.08;
        supervisor.rotation.x = Math.sin(time * 0.5) * 0.1;
        
        clusterAgents.forEach((agent, i) => {
            const eased = easeOutQuart(Math.max(0, (smooth - (0.15 + i * 0.08)) / (1 - (0.15 + i * 0.08))));
            agent.material.opacity = eased * 0.85;
            agent.scale.setScalar(eased);
            agent.rotation.y = time * 0.12 + i * 0.5;
            agent.userData.innerGraph.material.opacity = eased * 0.6;
            agent.userData.innerGraph.rotation.x = time * 0.3;

            if (eased > 0.5 && labelRefs.current[i]) {
                const screenPos = agent.position.clone().applyMatrix4(clusterGroup.matrixWorld).project(camera);
                const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
                labelRefs.current[i]!.style.transform = `translate(${x + 25}px, ${y - 8}px)`;
                labelRefs.current[i]!.style.opacity = String(eased);
            } else if (labelRefs.current[i]) {
                labelRefs.current[i]!.style.opacity = '0';
            }
        });

        supervisorBeams.forEach((beam, i) => {
            beam.material.opacity = easeOutQuart(Math.max(0, (smooth - (0.35 + i * 0.06)) / (1 - (0.35 + i * 0.06)))) * (0.25 + Math.sin(time * 4 + i * 1.2) * 0.15);
        });
        clusterGroup.rotation.y = smooth * Math.PI * 0.15;
    };

    const updateAct6 = (localProgress: number) => {
        hiveGroup.visible = true;
        const smooth = easeInOutCubic(localProgress);
        const time = Date.now() * 0.001;

        supervisor.material.opacity *= 0.95;
        supervisor.scale.setScalar(Math.max(0.01, supervisor.scale.x * 0.95));
        
        supervisor.rotation.y = time * 0.08;
        supervisor.rotation.x = Math.sin(time * 0.5) * 0.1;
        
        clusterGroup.rotation.y = Math.PI * 0.15;
        
        clusterAgents.forEach((a, i) => {
            a.material.opacity *= 0.95; 
            a.scale.setScalar(Math.max(0.01, a.scale.x * 0.95));
            a.rotation.y = time * 0.12 + i * 0.5;
            if (labelRefs.current[i]) labelRefs.current[i]!.style.opacity = '0';
        });
        supervisorBeams.forEach(b => b.material.opacity *= 0.95);

        clusters.forEach((c, i) => {
            const p = Math.max(0, (smooth - i * 0.012) / (1 - i * 0.012));
            const targetOp = easeOutQuart(p) * 0.75;
            c.children.forEach((child: any) => { 
                if (child.material) child.material.opacity += (targetOp - child.material.opacity) * 0.06; 
            });
            c.rotation.y = time * c.userData.rotSpeed * 8;
        });

        globalLines.forEach((l, i) => {
            l.material.opacity = easeOutQuart(Math.max(0, (smooth - (0.25 + i * 0.008)) / (1 - (0.25 + i * 0.008)))) * 0.25;
        });
        hiveGroup.rotation.y = time * 0.015;
        
        if (finalTextRef.current) {
            const opacity = smooth > 0.05 ? easeOutQuart((smooth - 0.05) / 0.8) : 0;
            finalTextRef.current.style.opacity = String(opacity);
            finalTextRef.current.style.transform = `translate(-50%, ${(1 - opacity) * 20}px)`;
        }
    };

    const updateCamera = (p: number) => {
        const act = Math.floor(p * 6);
        const actP = (p * 6) % 1;
        const smooth = easeInOutCubic(actP);
        
        if (act === 0) {
            // Act 0 -> 1: Dampen X-sway to 0 to align with Act 1 start
            camera.position.set(
                Math.sin(smooth * 0.3) * 3 * (1 - smooth), 
                -1 + smooth * 8, 
                10 - smooth * 3
            );
            camera.lookAt(0, -2 + smooth * 8, 0);
        } else if (act === 1) {
            // Act 1 End: y=2, z=13
            camera.position.set(Math.sin(smooth * Math.PI * 0.5) * 6, 7 - smooth * 5, 7 + smooth * 6);
            camera.lookAt(0, 6 - 5.5 * smooth, 0); 
        } else if (act === 2) {
            // Act 2 End: y=8, z=15
            const a = smooth * Math.PI * 0.5;
            camera.position.set(6 + Math.sin(a) * 8, 2 + smooth * 6, 13 + smooth * 2);
            camera.lookAt(0, 0.5, 0);
        } else if (act === 3) {
            // Act 3 End: y=15, z=22 (Smoothed Z)
            const tMs = Date.now() * 0.00005;
            const decay = 1 - smooth;
            camera.position.set(
                14 * decay + Math.sin(tMs) * 5 * smooth, 
                8 + smooth * 7, 
                15 + smooth * 7
            );
            camera.lookAt(0, 0.5 * (1 - smooth), 0);
        } else if (act === 4) {
            // Act 4 End: y=45, z=45 (Smoothed Z)
            // Added cosine wobble decay to smooth Y transition from Act 3
            const tMs = Date.now() * 0.00005;
            const wobble = Math.cos(tMs * 0.8) * 2 * (1 - smooth); 
            camera.position.set(
                Math.sin(tMs) * (5 + smooth * 5), 
                15 + smooth * 30 + wobble, 
                22 + smooth * 23
            );
            camera.lookAt(0,0,0);
        } else {
            // Act 5 End: y=105, z=100 (Smoothed Z)
            const tMs = Date.now() * 0.00005;
            camera.position.set(
                Math.sin(tMs) * (10 + smooth * 35), 
                45 + smooth * 60, 
                45 + smooth * 55
            );
            camera.lookAt(0,0,0);
        }
    };

    let animationFrameId: number;
    const animate = () => {
        const delta = clock.getDelta();
        
        const speedMultiplier = progress > 0.833 ? 0.4 : 1.0;
        
        progress += (delta / LOOP_DURATION) * speedMultiplier;
        if (progress > 1) progress = 0; 

        const act = Math.floor(progress * 6);
        const actP = (progress * 6) % 1;
        
        graphGroup.visible = false;
        agentGroup.visible = false;
        clusterGroup.visible = false;
        hiveGroup.visible = false;

        particles.visible = (act === 0);
        rings.forEach(r => {
            r.visible = (act <= 1);
            if (r.userData.glow) r.userData.glow.visible = (act <= 1);
        });
        wireframeSphere.visible = (act <= 2);

        if (act < 5) {
             clusters.forEach(c => {
                 c.children.forEach((child: any) => { if (child.material) child.material.opacity = 0; });
             });
             globalLines.forEach(l => l.material.opacity = 0);
        }

        if (act < 3) {
            agents.forEach(a => { a.position.copy(a.userData.startPos); a.userData.core.scale.setScalar(1); });
            supervisor.scale.setScalar(0);
            supervisor.material.opacity = 0;
            clusterAgents.forEach(a => { a.material.opacity = 0; a.userData.innerGraph.material.opacity = 0; });
            supervisorBeams.forEach(b => b.material.opacity = 0);
        }

        labelRefs.current.forEach(l => { if(l) l.style.opacity = '0'; });
        if (finalTextRef.current) {
            finalTextRef.current.style.opacity = '0';
        }

        if (act === 0) updateAct1(actP);
        else if (act === 1) { updateAct1(1); updateAct2(actP); }
        else if (act === 2) { updateAct2(1); updateAct3(actP); }
        else if (act === 3) { updateAct3(1); updateAct4(actP); }
        else if (act === 4) { updateAct4(1); updateAct5(actP); }
        else { updateAct5(1); updateAct6(actP); }

        updateCamera(progress);

        const newStage = Math.min(5, Math.floor(progress * 6));
        setCurrentStage(prev => prev !== newStage ? newStage : prev);

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (object.material instanceof THREE.Material) object.material.dispose();
            }
        });
    };
  }, []); // Run once on mount

  return (
    <>
      <div ref={containerRef} className="fixed top-0 left-0 w-full h-full z-0 bg-white" />

      {/* UI LAYERS */}
      <div ref={titleRef} className="fixed top-[60px] left-1/2 -translate-x-1/2 text-center text-gray-800 z-50 pointer-events-none transition-opacity duration-700">
        <div className="text-2xl font-light tracking-[0.5em] uppercase">{TITLES[currentStage]}</div>
      </div>

      <div className="fixed left-[30px] top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 pointer-events-none">
        {TITLES.map((_, idx) => (
            <div key={idx} className={`flex items-center gap-[10px] transition-all duration-300 ${idx === currentStage ? 'opacity-100' : idx < currentStage ? 'opacity-60' : 'opacity-30'}`}>
                <div className={`w-3 h-3 rounded-full border border-gray-800 transition-all duration-300 ${idx === currentStage ? 'bg-gray-800 scale-125' : idx < currentStage ? 'bg-gray-500' : 'bg-transparent'}`}></div>
                <div className={`text-[11px] tracking-[1px] uppercase font-mono ${idx === currentStage ? 'text-gray-800' : 'text-gray-400'}`}>
                    {idx === 0 ? "Данные" : idx === 1 ? "Граф" : idx === 2 ? "Сеть" : idx === 3 ? "Слияние" : idx === 4 ? "Кластер" : "Рой"}
                </div>
            </div>
        ))}
      </div>

      {AGENT_NAMES.map((name, i) => (
          <div 
            key={i} 
            ref={el => labelRefs.current[i] = el}
            className="fixed top-0 left-0 font-mono text-xs font-bold text-gray-900 pointer-events-none z-30 opacity-0 transition-opacity duration-500 tracking-widest whitespace-nowrap"
            style={{ textShadow: '0 0 4px white, 0 0 4px white', transform: 'translate(0,0)' }} 
          >
            {name}
          </div>
      ))}

      <div ref={finalTextRef} className="fixed bottom-[15%] left-1/2 -translate-x-1/2 text-center z-20 pointer-events-none opacity-0 transition-opacity duration-1000">
        <h2 className="text-lg font-light tracking-[3px] text-gray-900 mb-2">От одного факта — к стратегии государства</h2>
        <p className="text-[11px] text-gray-900/50 tracking-widest">Мультиагентная ИИ-система Аппарата Правительства РФ</p>
      </div>
    </>
  );
};

export default CognitiveExperience;
