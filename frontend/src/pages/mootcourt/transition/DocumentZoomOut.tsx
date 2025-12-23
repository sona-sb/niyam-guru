import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

export const DocumentZoomOut: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const document3DRef = useRef<THREE.Mesh | null>(null);
  const shadowPlaneRef = useRef<THREE.Mesh | null>(null);
  const deskRef = useRef<THREE.Mesh | null>(null);
  const judgeGroupRef = useRef<THREE.Group | null>(null);

  const stateRef = useRef({
    zoomOutProgress: 0,
    isZoomingOut: true,
    isComplete: false,
    hasNavigated: false
  });

  /* ---------------- UTILS ---------------- */

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---------------- TEXTURES ---------------- */

  const createWoodTexture = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#5c4636';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = 'rgba(60,40,20,0.25)';
      ctx.beginPath();
      const y = Math.random() * 512;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(150, y + 10, 350, y - 10, 512, y);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(c);
  };

  const createDocumentTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 664;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#f5f3ee';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      imageData.data[i] += noise;
      imageData.data[i + 1] += noise;
      imageData.data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);
    
    ctx.strokeStyle = '#d0ccc5';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    ctx.strokeStyle = '#e0dcd5';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    
    ctx.fillStyle = '#2c2c2c';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('FILE A CONSUMER', canvas.width / 2, 100);
    ctx.fillText('COMPLAINT', canvas.width / 2, 135);
    
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 155);
    ctx.lineTo(canvas.width - 120, 155);
    ctx.stroke();
    
    ctx.fillStyle = '#5a5a5a';
    ctx.font = '14px Georgia, serif';
    ctx.fillText('OFFICIAL FILING DOCUMENT', canvas.width / 2, 180);
    
    ctx.strokeStyle = '#c5c0b8';
    ctx.lineWidth = 1;
    const lineStartX = 60;
    const lineEndX = canvas.width - 60;
    const formLabels = [
      'Complainant Name:',
      'Address:',
      'Date of Incident:',
      'Description of Complaint:',
      '',
      '',
      'Relief Sought:',
      ''
    ];
    
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'left';
    
    let yPos = 230;
    formLabels.forEach((label) => {
      if (label) {
        ctx.fillText(label, lineStartX, yPos - 5);
      }
      ctx.beginPath();
      ctx.moveTo(lineStartX, yPos);
      ctx.lineTo(lineEndX, yPos);
      ctx.stroke();
      yPos += 35;
    });
    
    yPos += 20;
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '11px Georgia, serif';
    
    const checkboxes = [
      'I affirm that the information provided is true and accurate',
      'I understand this filing initiates a formal process',
      'I consent to the terms and conditions of this proceeding'
    ];
    
    checkboxes.forEach((text) => {
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.strokeRect(lineStartX, yPos - 10, 12, 12);
      ctx.fillText(text, lineStartX + 20, yPos);
      yPos += 25;
    });
    
    yPos = canvas.height - 120;
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '12px Georgia, serif';
    ctx.fillText('Signature:', lineStartX, yPos);
    ctx.strokeStyle = '#c5c0b8';
    ctx.beginPath();
    ctx.moveTo(lineStartX + 70, yPos);
    ctx.lineTo(canvas.width / 2 - 20, yPos);
    ctx.stroke();
    
    ctx.fillText('Date:', canvas.width / 2 + 20, yPos);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 + 60, yPos);
    ctx.lineTo(lineEndX, yPos);
    ctx.stroke();
    
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.arc(canvas.width - 100, canvas.height - 100, 50, 0, Math.PI * 2);
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(canvas.width - 100, canvas.height - 100, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('DOC-2025-CC-0001', canvas.width - 40, canvas.height - 35);
    
    return new THREE.CanvasTexture(canvas);
  };

  /* ---------------- JUDGE (DETAILED WITH CHAIR & WIG) ---------------- */

  // Palette for consistent colors
  const COLORS = {
    skin: 0xffcd94,
    robe: 0x1a1a1a,      // Almost black, soft charcoal
    white: 0xffffff,
    wood: 0x5c3a21,      // Dark mahogany
    woodLight: 0x8f5e3c, // Handle wood
    gold: 0xffd700,
    tie: 0x111111,       // Deep black
    hair: 0xeeeeee,      // Off-white wig
    chair: 0x3d1e10,     // Dark leather
  };

  const createDetailedJudge = (): THREE.Group => {
    const container = new THREE.Group();

    // Shared Materials (Flat shading looks best for minimal style)
    const mat = {
      skin: new THREE.MeshStandardMaterial({ color: COLORS.skin, roughness: 0.8, flatShading: true }),
      robe: new THREE.MeshStandardMaterial({ color: COLORS.robe, roughness: 0.9, flatShading: true }),
      white: new THREE.MeshStandardMaterial({ color: COLORS.white, roughness: 1.0, flatShading: true }),
      wood: new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.5, flatShading: true }),
      gold: new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.6, roughness: 0.2 }),
      tie: new THREE.MeshStandardMaterial({ color: COLORS.tie, roughness: 0.9 }),
      wig: new THREE.MeshStandardMaterial({ color: COLORS.hair, roughness: 1.0, flatShading: true }),
      chair: new THREE.MeshStandardMaterial({ color: COLORS.chair, roughness: 0.7, flatShading: true }),
    };

    // ==========================
    // 1. THE CHAIR
    // ==========================
    const chairGroup = new THREE.Group();
    
    // Seat
    const seatGeo = new THREE.BoxGeometry(1.6, 0.2, 1.6);
    const seat = new THREE.Mesh(seatGeo, mat.chair);
    seat.position.y = 0.8;
    seat.castShadow = true;
    chairGroup.add(seat);

    // Backrest (Tall and imposing)
    const backGeo = new THREE.BoxGeometry(1.6, 2.5, 0.3);
    const back = new THREE.Mesh(backGeo, mat.chair);
    back.position.set(0, 2.0, -0.65);
    back.castShadow = true;
    chairGroup.add(back);

    // Armrests
    const armGeo = new THREE.BoxGeometry(0.2, 0.4, 1.4);
    const armL = new THREE.Mesh(armGeo, mat.chair);
    armL.position.set(-0.7, 1.1, 0);
    armL.castShadow = true;
    chairGroup.add(armL);
    
    const armR = new THREE.Mesh(armGeo, mat.chair);
    armR.position.set(0.7, 1.1, 0);
    armR.castShadow = true;
    chairGroup.add(armR);

    container.add(chairGroup);

    // ==========================
    // 2. BODY & TORSO
    // ==========================
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.9; // Sit on chair
    
    // Main Torso (Robe)
    const torsoGeo = new THREE.BoxGeometry(1.1, 1.4, 0.7);
    const torso = new THREE.Mesh(torsoGeo, mat.robe);
    torso.position.y = 0.7;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // White Shirt Insert (Visible in middle)
    const shirtGeo = new THREE.BoxGeometry(0.4, 1.3, 0.05);
    const shirt = new THREE.Mesh(shirtGeo, mat.white);
    shirt.position.set(0, 0.7, 0.36); // Slightly forward of robe
    bodyGroup.add(shirt);

    // Black Tie
    const tieGeo = new THREE.BoxGeometry(0.15, 0.9, 0.05);
    const tie = new THREE.Mesh(tieGeo, mat.tie);
    tie.position.set(0, 0.6, 0.38);
    bodyGroup.add(tie);

    // Collar (Two angled boxes)
    const collarGeo = new THREE.BoxGeometry(0.15, 0.05, 0.1);
    const collarL = new THREE.Mesh(collarGeo, mat.white);
    collarL.position.set(-0.12, 1.35, 0.38);
    collarL.rotation.z = -0.3;
    bodyGroup.add(collarL);

    const collarR = new THREE.Mesh(collarGeo, mat.white);
    collarR.position.set(0.12, 1.35, 0.38);
    collarR.rotation.z = 0.3;
    bodyGroup.add(collarR);

    // ==========================
    // 3. HEAD & FACE
    // ==========================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.5, 0); // Top of body

    // Face shape
    const faceGeo = new THREE.BoxGeometry(0.6, 0.7, 0.6);
    const face = new THREE.Mesh(faceGeo, mat.skin);
    face.castShadow = true;
    headGroup.add(face);

    // Eyes (Simple dark rectangles)
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.05, 0.05);
    const eyeL = new THREE.Mesh(eyeGeo, mat.tie);
    eyeL.position.set(-0.15, 0.05, 0.3);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, mat.tie);
    eyeR.position.set(0.15, 0.05, 0.3);
    headGroup.add(eyeR);

    // Eyebrows (Angled for stern look)
    const browGeo = new THREE.BoxGeometry(0.15, 0.03, 0.05);
    const browL = new THREE.Mesh(browGeo, mat.robe);
    browL.position.set(-0.15, 0.15, 0.31);
    browL.rotation.z = 0.2; // Angry tilt
    headGroup.add(browL);

    const browR = new THREE.Mesh(browGeo, mat.robe);
    browR.position.set(0.15, 0.15, 0.31);
    browR.rotation.z = -0.2; // Angry tilt
    headGroup.add(browR);

    // ==========================
    // 4. THE WIG (Procedural Curls)
    // ==========================
    // Top part
    const wigTopGeo = new THREE.BoxGeometry(0.7, 0.2, 0.7);
    const wigTop = new THREE.Mesh(wigTopGeo, mat.wig);
    wigTop.position.y = 0.4;
    wigTop.castShadow = true;
    headGroup.add(wigTop);

    // Side Curls (Vertical cylinders)
    const curlGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    // Create 3 curls per side
    for (let i = 0; i < 3; i++) {
      // Left side curls
      const curlL = new THREE.Mesh(curlGeo, mat.wig);
      curlL.position.set(-0.38, 0.1 - (i * 0.1), 0.2 - (i * 0.2)); 
      curlL.castShadow = true;
      headGroup.add(curlL);

      // Right side curls
      const curlR = new THREE.Mesh(curlGeo, mat.wig);
      curlR.position.set(0.38, 0.1 - (i * 0.1), 0.2 - (i * 0.2)); 
      curlR.castShadow = true;
      headGroup.add(curlR);
    }
    
    // Back Curls (One wide block)
    const wigBackGeo = new THREE.BoxGeometry(0.8, 0.6, 0.2);
    const wigBack = new THREE.Mesh(wigBackGeo, mat.wig);
    wigBack.position.set(0, 0, -0.35);
    wigBack.castShadow = true;
    headGroup.add(wigBack);

    bodyGroup.add(headGroup);

    // ==========================
    // 5. ARMS
    // ==========================
    
    // -- Left Arm (Resting on table/armrest) --
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.6, 1.2, 0);
    
    const sleeveLGeo = new THREE.BoxGeometry(0.4, 0.9, 0.4);
    const sleeveL = new THREE.Mesh(sleeveLGeo, mat.robe);
    sleeveL.rotation.z = 0.2; // Slight outward angle
    sleeveL.castShadow = true;
    armLGroup.add(sleeveL);

    const handLGeo = new THREE.BoxGeometry(0.2, 0.25, 0.2);
    const handL = new THREE.Mesh(handLGeo, mat.skin);
    handL.position.set(0.1, -0.5, 0);
    handL.castShadow = true;
    armLGroup.add(handL);

    bodyGroup.add(armLGroup);

    // -- Right Arm (Holding Gavel) --
    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.6, 1.2, 0.2); // Forward slightly
    
    const sleeveRGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4);
    const sleeveR = new THREE.Mesh(sleeveRGeo, mat.robe);
    sleeveR.rotation.x = -0.5; // Raised forward to slam gavel
    sleeveR.castShadow = true;
    armRGroup.add(sleeveR);

    const handR = new THREE.Mesh(handLGeo, mat.skin);
    handR.position.set(0, -0.5, 0.3); // Hand sticking out
    handR.castShadow = true;
    armRGroup.add(handR);

    // ==========================
    // 6. GAVEL (Detailed)
    // ==========================
    const gavelGroup = new THREE.Group();
    gavelGroup.position.set(0, -0.5, 0.3); // In hand
    gavelGroup.rotation.x = 1.5; // Vertical handle
    
    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8);
    const handle = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({color: COLORS.woodLight}));
    handle.position.y = 0.2;
    handle.castShadow = true;
    gavelGroup.add(handle);

    // Hammer Head
    const headSize = { r: 0.12, h: 0.35 };
    const hammerGeo = new THREE.CylinderGeometry(headSize.r, headSize.r, headSize.h, 12);
    const hammer = new THREE.Mesh(hammerGeo, mat.wood);
    hammer.rotation.z = Math.PI / 2;
    hammer.position.y = 0.55;
    hammer.castShadow = true;
    gavelGroup.add(hammer);

    // Gold Bands on Gavel
    const bandGeo = new THREE.CylinderGeometry(headSize.r + 0.005, headSize.r + 0.005, 0.03, 12);
    const band1 = new THREE.Mesh(bandGeo, mat.gold);
    band1.rotation.z = Math.PI / 2;
    band1.position.x = 0.1; 
    band1.position.y = 0.55;
    gavelGroup.add(band1);

    const band2 = band1.clone();
    band2.position.x = -0.1;
    gavelGroup.add(band2);

    armRGroup.add(gavelGroup);
    bodyGroup.add(armRGroup);

    container.add(bodyGroup);

    return container;
  };

  /* ---------------- EFFECT ---------------- */

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f8f8);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.9, 5.2);
    camera.lookAt(0, 0, -1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    scene.add(key);

    const fillLight = new THREE.DirectionalLight(0xfff5e6, 0.3);
    fillLight.position.set(-2, 2, 1);
    scene.add(fillLight);

    // DESK
    const woodTex = createWoodTexture();
    const deskMaterial = new THREE.MeshStandardMaterial({ 
      map: woodTex,
      roughness: 0.7,
      metalness: 0.1
    });
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.12, 4),
      deskMaterial
    );
    desk.position.set(0, -1.06, -0.5);
    desk.castShadow = true;
    desk.receiveShadow = true;
    desk.visible = false;
    scene.add(desk);
    deskRef.current = desk;

    // JUDGE - Detailed with chair, wig & gavel, positioned behind desk
    const judge = createDetailedJudge();
    judge.scale.set(0.4, 0.4, 0.4); // Scale to fit the scene
    judge.position.set(0, -1.4, -2.8); // Behind the desk (negative Z), adjusted Y for desk height
    judge.visible = false;
    scene.add(judge);
    judgeGroupRef.current = judge;

    // DOCUMENT
    const documentTexture = createDocumentTexture();
    const docWidth = 1.7;
    const docHeight = 2.2;
    const docDepth = 0.02;

    const documentGeometry = new THREE.BoxGeometry(docWidth, docHeight, docDepth);

    const frontMaterial = new THREE.MeshStandardMaterial({
      map: documentTexture,
      roughness: 0.9,
      metalness: 0.0,
      emissive: new THREE.Color(0.5, 0.5, 0.5)
    });

    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0ede8,
      roughness: 0.8,
      metalness: 0.0
    });

    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0xebe8e3,
      roughness: 0.9,
      metalness: 0.0
    });

    const materials = [
      sideMaterial,
      sideMaterial,
      sideMaterial,
      sideMaterial,
      frontMaterial,
      backMaterial
    ];

    const document3D = new THREE.Mesh(documentGeometry, materials);
    document3D.castShadow = true;
    document3D.receiveShadow = true;
    document3D.position.z = 4.85;
    document3D.scale.setScalar(8);
    scene.add(document3D);
    document3DRef.current = document3D;

    // Shadow plane
    const shadowPlaneGeometry = new THREE.PlaneGeometry(10, 10);
    const shadowPlaneMaterial = new THREE.ShadowMaterial({ opacity: 0 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeometry, shadowPlaneMaterial);
    shadowPlane.position.set(0, -0.999, -0.5);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    /* ---------------- ANIMATION ---------------- */

    const animate = () => {
      requestAnimationFrame(animate);

      const s = stateRef.current;
      
      if (s.isZoomingOut && !s.isComplete) {
        s.zoomOutProgress += 0.004;
        const t = Math.min(s.zoomOutProgress, 1);

        // Phase 1: Fade from white (0 to 0.15)
        if (t <= 0.15) {
          const fadePhase = t / 0.15;
          const fadeEased = easeOutCubic(fadePhase);

          if (scene.background instanceof THREE.Color) {
            scene.background.setRGB(
              lerp(1, 0.973, fadeEased),
              lerp(1, 0.973, fadeEased),
              lerp(1, 0.973, fadeEased)
            );
          }

          frontMaterial.emissive.setRGB(
            lerp(0.5, 0, fadeEased),
            lerp(0.5, 0, fadeEased),
            lerp(0.5, 0, fadeEased)
          );
        }

        // Phase 2: Pull back and reveal scene (0.15 to 0.5)
        if (t > 0.15 && t <= 0.5) {
          const pullbackPhase = (t - 0.15) / 0.35;
          const pullbackEased = easeInOutCubic(pullbackPhase);

          document3D.position.z = lerp(4.85, 1.5, pullbackEased);
          document3D.scale.setScalar(lerp(8, 2, pullbackEased));

          if (t > 0.25) {
            desk.visible = true;
            judge.visible = true;
            const sceneFade = (t - 0.25) / 0.25;
            const fadeAmount = easeOutCubic(sceneFade);
            deskMaterial.opacity = fadeAmount;
            deskMaterial.transparent = t < 0.5;
          }
        }

        // Phase 3: Document floats down to desk (0.5 to 1.0)
        if (t > 0.5) {
          const floatPhase = (t - 0.5) / 0.5;
          const floatEased = easeInOutCubic(floatPhase);

          const arcProgress = Math.sin(floatPhase * Math.PI);
          document3D.position.x = lerp(0, 0.3, arcProgress * 0.5);
          document3D.position.y = lerp(0, -0.99, floatEased);
          document3D.position.z = lerp(1.5, -0.35, floatEased);

          document3D.scale.setScalar(lerp(2, 1, floatEased));

          document3D.rotation.x = lerp(0, Math.PI / 2, floatEased);
          document3D.rotation.y = 0;
          document3D.rotation.z = lerp(0, -0.08, floatEased);

          shadowPlaneMaterial.opacity = lerp(0, 0.25, floatEased);

          deskMaterial.transparent = false;
          deskMaterial.opacity = 1;
        }

        if (t >= 1) {
          s.isComplete = true;
          s.isZoomingOut = false;
          document3D.position.set(0.3, -0.99, -0.35);
          document3D.rotation.set(Math.PI / 2, 0, -0.08);
          document3D.scale.setScalar(1);

          // Navigate after animation completes
          if (!s.hasNavigated) {
            s.hasNavigated = true;
            setTimeout(() => {
              navigate('/mootcourt/questions');
            }, 500);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }

      documentGeometry.dispose();
      frontMaterial.dispose();
      sideMaterial.dispose();
      backMaterial.dispose();
      documentTexture.dispose();
      shadowPlaneGeometry.dispose();
      shadowPlaneMaterial.dispose();
      woodTex.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#f8f8f8'
      }}
    />
  );
};

export default DocumentZoomOut;
