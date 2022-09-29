import * as THREE from 'https://cdn.skypack.dev/three@0.142.0';
import { EffectComposer } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/EffectComposer.js';
import { HorizontalBlurShader } from "./HorizontalBlurShader.js";
import { VerticalBlurShader } from "./VerticalBlurShader.js";
import { RenderPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'https://unpkg.com/three@0.142.0/examples/jsm/shaders/GammaCorrectionShader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.142.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.142.0/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'https://unpkg.com/three@0.142.0/examples/jsm/utils/BufferGeometryUtils.js';
import { SimplifyModifier } from 'https://unpkg.com/three@0.142.0/examples/jsm/modifiers/SimplifyModifier.js';
import { ConvexGeometry } from 'https://unpkg.com/three@0.142.0/examples/jsm/geometries/ConvexGeometry.js';
import { EffectShader } from "./EffectShader.js";
import { EffectCompositer } from "./EffectCompositer.js";
import { AssetManager } from './AssetManager.js';
import { Stats } from "./stats.js";
async function main() {
    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    let clientWidth, clientHeight, defaultTexture, effectCompositer, effectPass, composer, hblur, vblur;
    Ammo().then(function(Ammo) {

        // - Global variables -

        // Graphics variables
        let container, stats;
        let camera, controls, scene, renderer;
        let texture;
        let clock = new THREE.Clock();

        // Physics variables
        let physicsWorld;
        const margin = 0.01;
        const rigidBodies = [];
        let pos = new THREE.Vector3();
        let quat = new THREE.Quaternion();
        let transformAux1;
        let tempBtVec3_1;
        let allLoaded = false;
        // Models
        let urls = [
            'chain.glb'
        ];

        // - Main code -
        init();
        animate();

        function init() {

            initGraphics();

            initPhysics();

            createObjects();

        }

        function initGraphics() {


            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xbfd1e5);
            clientWidth = window.innerWidth;
            clientHeight = window.innerHeight;
            renderer = new THREE.WebGLRenderer();
            renderer.setPixelRatio(1);
            renderer.setSize(clientWidth, clientHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            defaultTexture = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.NearestFilter
            });
            defaultTexture.depthTexture = new THREE.DepthTexture(clientWidth, clientHeight, THREE.FloatType);
            composer = new EffectComposer(renderer);
            const smaaPass = new SMAAPass(clientWidth, clientHeight);
            effectPass = new ShaderPass(EffectShader);
            effectCompositer = new ShaderPass(EffectCompositer);
            hblur = new ShaderPass(HorizontalBlurShader);
            vblur = new ShaderPass(VerticalBlurShader);
            const blurSize = 0.25;
            hblur.uniforms.h.value = blurSize * (clientHeight / clientWidth);
            vblur.uniforms.v.value = blurSize;
            composer.addPass(effectPass);
            for (let i = 0; i < 3; i++) {
                composer.addPass(hblur);
                composer.addPass(vblur);
            }
            composer.addPass(effectCompositer);
            composer.addPass(new ShaderPass(GammaCorrectionShader));
            composer.addPass(smaaPass);
            document.body.appendChild(renderer.domElement);

            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);
            camera.position.set(-40 / 3, 34 / 3, 30 / 3);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.target.y = 10;
            controls.update();

            const ambientLight = new THREE.AmbientLight(0x404040);
            scene.add(ambientLight);

            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(0, 200, 0);
            light.castShadow = true;
            const d = 150;
            light.shadow.camera.left = -125;
            light.shadow.camera.right = 125;
            light.shadow.camera.top = 75;
            light.shadow.camera.bottom = -75;

            light.shadow.camera.near = 2;
            light.shadow.camera.far = 250;

            light.shadow.mapSize.x = 1024 * 2;
            light.shadow.mapSize.y = 1024 * 2;
            light.shadow.radius = 4.0;
            light.shadow.blurSamples = 16.0;
            //light.shadow.bias = -0.001;
            // scene.add(new THREE.CameraHelper(light.shadow.camera));
            scene.add(light);

            stats = new Stats();
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.top = '0px';
            document.body.appendChild(stats.domElement);

            //window.addEventListener('resize', onWindowResize);

        }

        function initPhysics() {

            // Physics configuration
            // ---------------------

            let m_collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            let m_dispatcher = new Ammo.btCollisionDispatcher(m_collisionConfiguration);
            let m_broadphase = new Ammo.btDbvtBroadphase();
            let m_constraintSolver = new Ammo.btSequentialImpulseConstraintSolver();

            physicsWorld = new Ammo.btDiscreteDynamicsWorld(m_dispatcher, m_broadphase, m_constraintSolver, m_collisionConfiguration);
            physicsWorld.setGravity(new Ammo.btVector3(0, -9.81, 0));

            Ammo.btGImpactCollisionAlgorithm.prototype.registerAlgorithm(physicsWorld.getDispatcher());

            transformAux1 = new Ammo.btTransform();
            tempBtVec3_1 = new Ammo.btVector3(0, 0, 0);

        }

        function loadModels(urls) {
            urls.forEach(url => {
                gltfLoader.load(
                    url,
                    (gltf) => {

                        scene.add(gltf.scene);

                        gltf.scene.traverse((child) => {
                            if (child.type == 'Mesh') {
                                child.geometry.deleteAttribute('normal');
                                child.geometry = BufferGeometryUtils.mergeVertices(child.geometry);
                                child.geometry.computeVertexNormals();
                                child.material = new THREE.MeshStandardMaterial({
                                    roughness: 0.3,
                                    metalness: 1.0
                                })
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.material.side = THREE.FrontSide;

                                let trimesh = createGImpactCollision(child);

                                pos.copy(child.position);
                                quat.copy(child.quaternion);

                                if (child.name == 'Static') {
                                    let body = createRigidBody(child, trimesh, 0, pos, quat);
                                    body.setCollisionFlags(body.getCollisionFlags() | 1 /* btCollisionObject:: CF_STATIC_OBJECT */ );
                                } else {
                                    createRigidBody(child, trimesh, 1, pos, quat);
                                }

                            }
                        })
                    }
                )
            });
        }

        function createObjects() {

            // Ground
            pos.set(0, -0.5, 0);
            quat.set(0, 0, 0, 1);
            /* const ground = createParalellepipedWithPhysics(40, 1, 40, 0, pos, quat, new THREE.MeshStandardMaterial({
                 color: 0xFFFFFF
             }));
             scene.add(ground);
            ground.receiveShadow = true;
            textureLoader.load('../textures/grid.png', function(texture) {

                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(40, 40);
                ground.material.map = texture;
                ground.material.needsUpdate = true;

            });*/

            // Wall
            let brickMass = 0.5;
            let brickLength = 2;
            let brickDepth = 1;
            let brickHeight = brickLength * 0.5;
            let numBricksLength = 6;
            let numBricksHeight = 8;
            let z0 = -numBricksLength * brickLength * 0.5;
            pos.set(0, brickHeight * 0.5, z0);
            quat.set(0, 0, 0, 1);
            for (let j = 0; j < numBricksHeight; j++) {

                let oddRow = (j % 2) == 1;

                pos.z = z0;

                if (oddRow) {
                    pos.z -= 0.25 * brickLength;
                }

                let nRow = oddRow ? numBricksLength + 1 : numBricksLength;
                for (let i = 0; i < nRow; i++) {

                    let brickLengthCurrent = brickLength;
                    let brickMassCurrent = brickMass;
                    if (oddRow && (i == 0 || i == nRow - 1)) {
                        brickLengthCurrent *= 0.5;
                        brickMassCurrent *= 0.5;
                    }

                    let brick = createParalellepiped(brickDepth, brickHeight, brickLengthCurrent, brickMassCurrent, pos, quat, createMaterial());
                    brick.castShadow = true;
                    brick.receiveShadow = true;
                    scene.add(brick);

                    if (oddRow && (i == 0 || i == nRow - 2)) {
                        pos.z += 0.75 * brickLength;
                    } else {
                        pos.z += brickLength;
                    }

                }
                pos.y += brickHeight;
            }

            function makeConvexHull(child, points = 32) {
                const modifier = new SimplifyModifier();
                const collisionMesh = child.clone();
                collisionMesh.geometry = collisionMesh.geometry.clone();
                // collisionMesh.material.flatShading = true;
                collisionMesh.geometry.deleteAttribute('normal');
                collisionMesh.geometry = BufferGeometryUtils.mergeVertices(collisionMesh.geometry);
                collisionMesh.geometry.computeVertexNormals();
                //const count = Math.floor(collisionMesh.geometry.attributes.position.count * 0.0); // number of vertices to remove
                // collisionMesh.geometry = modifier.modify(collisionMesh.geometry, count);
                let vertexPoses = [];
                let p = collisionMesh.geometry.attributes.position;
                for (let i = 0; i < p.count; i++) {
                    vertexPoses.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
                }
                let hullGeo = new ConvexGeometry(vertexPoses);
                hullGeo.deleteAttribute('normal');
                hullGeo = BufferGeometryUtils.mergeVertices(hullGeo);
                hullGeo.computeVertexNormals();
                const count = hullGeo.attributes.position.count - points;
                hullGeo = modifier.modify(hullGeo, count);
                hullGeo.computeVertexNormals();
                //scene.add(new THREE.Mesh(hullGeo.clone().translate(0, 15, 0), new THREE.MeshStandardMaterial()));
                vertexPoses = [];
                p = hullGeo.attributes.position;
                for (let i = 0; i < p.count; i++) {
                    vertexPoses.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
                }
                let trimesh = new Ammo.btConvexHullShape(); //createGImpactCollision(collisionMesh);
                vertexPoses.forEach(vertex => {
                    trimesh.addPoint(new Ammo.btVector3(vertex.x, vertex.y, vertex.z), true);
                });
                return trimesh;
            }

            // Chain
            loadModels(urls);
            //console.log(Object.keys(Ammo).filter(x => x.toLowerCase().includes("hacd")));
            gltfLoader.load("dragonchosen.glb", dragonGltf => {
                gltfLoader.load("bunnychosen.glb", bunnyGltf => {
                    const meshMat = new THREE.MeshStandardMaterial({
                        roughness: 0.3,
                        metalness: 0.0,
                        envMapIntensity: 1.0,
                        side: THREE.FrontSide,
                        vertexColors: true,
                        color: new THREE.Color(0.5, 0.5, 0.5),
                        dithering: true
                    });
                    // scene.add(dragonGltf.scene);
                    // scene.add(gltf.scene);
                    const setup = (child) => {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        const normalMap = child.material.normalMap;
                        //console.log(normalMap);
                        child.material = meshMat.clone();
                        child.material.normalMap = normalMap;
                        child.geometry.scale(0.01, 0.01, 0.01);
                        //child.geometry.computeTangents();
                        //console.log(child.geometry.attributes.position.count)
                    }
                    let dragonGeo;
                    dragonGltf.scene.traverse((c) => {
                        if (c.type == 'Mesh') {
                            dragonGeo = c;
                        }
                    });
                    setup(dragonGeo)
                    let bunnyGeo;
                    bunnyGltf.scene.traverse((c) => {
                        if (c.type == 'Mesh') {
                            bunnyGeo = c;
                        }
                    });
                    setup(bunnyGeo);

                    /* pos.copy(child.position);
                     quat.copy(child.quaternion);
                     createRigidBody(child, trimesh, 1, pos, quat);*/
                    const dragonShape = makeConvexHull(dragonGeo, 32);
                    const bunnyShape = makeConvexHull(bunnyGeo, 32);
                    for (let x = -1; x <= 1; x += 1) {
                        for (let z = -1; z <= 1; z++) {
                            let choice = Math.random() < 0.5 ? "dragon" : "bunny";
                            const geo = choice === "bunny" ? bunnyGeo : dragonGeo;
                            const shape = choice === "bunny" ? bunnyShape : dragonShape;
                            pos.copy(geo.position.clone().add(new THREE.Vector3(x * 75, x === 0 ? 10 : 0, 5.0 * z - 1.0)));
                            quat.copy(geo.quaternion);
                            const otherChild = geo.clone();
                            otherChild.geometry = otherChild.geometry.clone();
                            const color = new THREE.Color(Math.random(), Math.random(), Math.random());
                            const colors = [];
                            for (let i = 0; i < otherChild.geometry.attributes.position.count; i++) {
                                colors.push(color.r, color.g, color.b);
                            }
                            otherChild.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
                            scene.add(otherChild);
                            createRigidBody(otherChild, shape, 1, pos, quat);
                        }
                    }
                    window.addEventListener('pointerdown', function(event) {
                        const raycaster = new THREE.Raycaster();
                        const mouseCoords = new THREE.Vector2();
                        mouseCoords.set(
                            (event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1
                        );

                        raycaster.setFromCamera(mouseCoords, camera);

                        // Creates a ball and throws it
                        const ballMass = 1;
                        const ballRadius = 0.4;
                        let choice = Math.random() < 0.5 ? "dragon" : "bunny";
                        const ball = choice === "bunny" ? bunnyGeo.clone() : dragonGeo.clone();
                        ball.geometry = ball.geometry.clone();
                        const color = new THREE.Color(Math.random(), Math.random(), Math.random());
                        const colors = [];
                        for (let i = 0; i < ball.geometry.attributes.position.count; i++) {
                            colors.push(color.r, color.g, color.b);
                        }
                        ball.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
                        ball.lookAt(ball.position.clone().add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)));
                        scene.add(ball);
                        ball.castShadow = true;
                        ball.receiveShadow = true;
                        const ballShape = choice === "bunny" ? bunnyShape : dragonShape;
                        pos.copy(raycaster.ray.direction);
                        pos.add(raycaster.ray.origin);
                        quat.copy(ball.quaternion);
                        const ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);

                        pos.copy(raycaster.ray.direction);
                        pos.multiplyScalar(1200);
                        ballBody.applyForce(new Ammo.btVector3(pos.x, pos.y, pos.z), new Ammo.btVector3(0, 0, 0));
                        pos.copy(raycaster.ray.direction);
                        const normal = camera.getWorldDirection(new THREE.Vector3())
                        let helper = new THREE.Vector3(0, 1, 0);
                        let up = false;
                        if (Math.abs(normal.y) > 0.8) {
                            up = true;
                            helper = new THREE.Vector3(normal.x, 0, normal.z).normalize();
                        }
                        const tangent = normal.clone().cross(helper).normalize();
                        const binormal = normal.clone().cross(tangent).normalize();
                        pos.cross(binormal.clone().multiplyScalar(-1));
                        camera.updateMatrix();
                        camera.updateMatrixWorld();
                        const elems = camera.matrixWorld.elements;
                        pos.set(-elems[0], -elems[1], -elems[2]);
                        pos.multiplyScalar(1200);
                        ballBody.applyTorque(new Ammo.btVector3(pos.x, pos.y, pos.z));
                    });
                });
            })

            gltfLoader.load("sponzasmall.glb", gltf => {
                gltfLoader.load("sponza.glb", gltflarge => {
                    gltflarge.scene.traverse(m => {
                        if (m.isMesh) {
                            m.castShadow = true;
                            m.receiveShadow = true;
                            if (m.material.map) {
                                m.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                            }
                            m.material.dithering = true;
                        }
                    })
                    gltf.scene.scale.set(10, 10, 10);
                    gltflarge.scene.scale.set(10, 10, 10);
                    scene.add(gltflarge.scene);
                    let geometries = [];
                    gltf.scene.traverse(object => {
                        if (object.geometry) {
                            const cloned = new THREE.Mesh(object.geometry, object.material);
                            object.getWorldPosition(cloned.position);
                            if (object.geometry && object.visible) {
                                const cloned = object.geometry.clone();
                                cloned.applyMatrix4(object.matrixWorld);
                                for (const key in cloned.attributes) {
                                    if (key !== 'position') {
                                        cloned.deleteAttribute(key);
                                    }
                                }
                                geometries.push(cloned);
                            }
                        }
                    });
                    let mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries.map(geom => geom.toNonIndexed()), false);
                    mergedGeometry.deleteAttribute('normal');
                    mergedGeometry = BufferGeometryUtils.mergeVertices(mergedGeometry);
                    const modifier = new SimplifyModifier();
                    //  const count = Math.floor(mergedGeometry.attributes.position.count * 0.9); // number of vertices to remove
                    //   mergedGeometry = modifier.modify(mergedGeometry, count);
                    mergedGeometry.computeVertexNormals();
                    //scene.add(new THREE.Mesh(mergedGeometry, new THREE.MeshStandardMaterial({})));
                    const {
                        faces,
                        vertices
                    } = getMeshData(new THREE.Mesh(mergedGeometry));
                    let ammoMesh = new Ammo.btTriangleMesh();
                    for (let i = 0, l = faces.length; i < l; i++) {
                        let a = faces[i].a;
                        let b = faces[i].b;
                        let c = faces[i].c;
                        ammoMesh.addTriangle(
                            new Ammo.btVector3(vertices[a].x, vertices[a].y, vertices[a].z),
                            new Ammo.btVector3(vertices[b].x, vertices[b].y, vertices[b].z),
                            new Ammo.btVector3(vertices[c].x, vertices[c].y, vertices[c].z),
                            false
                        );
                    }

                    let triangleShape = new Ammo.btBvhTriangleMeshShape(ammoMesh, true, true);
                    triangleShape.setMargin(margin);
                    triangleShape.setLocalScaling(new Ammo.btVector3(1, 1, 1));
                    pos.copy(gltf.scene.position);
                    quat.copy(gltf.scene.quaternion);
                    let body = createRigidBody(gltflarge.scene, triangleShape, 0, pos, quat);
                    body.setCollisionFlags(body.getCollisionFlags() | 1 /* btCollisionObject:: CF_STATIC_OBJECT */ );
                    allLoaded = true;
                    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
                        generateMipmaps: true,
                        minFilter: THREE.LinearMipmapLinearFilter,
                        encoding: THREE.sRGBEncoding
                    });

                    // Create cube camera
                    const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
                    scene.add(cubeCamera);
                    cubeCamera.position.set(0, 15, 0);
                    cubeCamera.update(renderer, scene);
                    //cubeRenderTarget.texture.encoding = THREE.sRGBEncoding;
                    //cubeRenderTarget.texture.encoding = THREE.sRGBEncoding;
                    scene.traverse(e => {
                        if (e.isMesh) {
                            e.material.envMap = cubeRenderTarget.texture;
                        }
                    })

                });
            });

        }

        function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material) {

            const object = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
            const shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
            shape.setMargin(margin);

            createRigidBody(object, shape, mass, pos, quat);

            return object;

        }

        function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {

            let threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
            let shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
            shape.setMargin(margin);

            createRigidBody(threeObject, shape, mass, pos, quat);

            return threeObject;

        }

        function createRandomColor() {

            return Math.floor(Math.random() * (1 << 24));

        }

        function createMaterial(color) {

            color = color || createRandomColor();
            return new THREE.MeshStandardMaterial({
                color: color
            });

        }

        function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {

            if (pos) {

                object.position.copy(pos);

            } else {

                pos = object.position;

            }

            if (quat) {

                object.quaternion.copy(quat);

            } else {

                quat = object.quaternion;

            }

            const transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
            transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
            const motionState = new Ammo.btDefaultMotionState(transform);

            const localInertia = new Ammo.btVector3(0, 0, 0);
            physicsShape.calculateLocalInertia(mass, localInertia);

            const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
            const body = new Ammo.btRigidBody(rbInfo);

            body.setFriction(0.5);

            if (vel) {

                body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));

            }

            if (angVel) {

                body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));

            }

            object.userData.physicsBody = body;
            object.userData.collided = false;

            if (mass > 0) {

                rigidBodies.push(object);

                // Disable deactivation
                body.setActivationState(4);

            }

            physicsWorld.addRigidBody(body);

            return body;

        }


        function getMeshData(mesh) {

            const index = mesh.geometry.index !== null ? mesh.geometry.index : undefined;
            const attributes = mesh.geometry.attributes;
            const scale = mesh.scale;

            if (attributes.position === undefined) {

                console.error('getMeshData(): Position attribute required for conversion.');
                return;

            }

            const position = attributes.position;

            let vertices = [];
            let faces = [];

            for (let i = 0; i < position.count; i++) {

                vertices.push({
                    x: scale.x * position.getX(i),
                    y: scale.y * position.getY(i),
                    z: scale.z * position.getZ(i)
                });

            }

            if (index !== undefined) {

                for (let i = 0; i < index.count; i += 3) {

                    faces.push({
                        a: index.getX(i),
                        b: index.getX(i + 1),
                        c: index.getX(i + 2)
                    });

                }

            } else {

                for (let i = 0; i < position.count; i += 3) {

                    faces.push({
                        a: i,
                        b: i + 1,
                        c: i + 2
                    });

                }
            }

            return {
                vertices,
                faces
            }
        }


        function createGImpactCollision(mesh, scale) {

            let faces, vertices;
            let totvert = 0;

            if (mesh.isMesh) {
                let data = getMeshData(mesh);

                faces = data.faces;
                vertices = data.vertices;

                totvert = vertices.length;

            } else {
                console.error("cannot make mesh shape for non-Mesh object");
            }

            if (totvert == 0) {
                console.error("no vertices to define mesh shape with");
            }

            if (!scale)
                scale = {
                    x: 1,
                    y: 1,
                    z: 1
                };

            /* vertices, faces */
            let ammoMesh = new Ammo.btTriangleMesh();
            for (let i = 0, l = faces.length; i < l; i++) {
                let a = faces[i].a;
                let b = faces[i].b;
                let c = faces[i].c;
                ammoMesh.addTriangle(
                    new Ammo.btVector3(vertices[a].x, vertices[a].y, vertices[a].z),
                    new Ammo.btVector3(vertices[b].x, vertices[b].y, vertices[b].z),
                    new Ammo.btVector3(vertices[c].x, vertices[c].y, vertices[c].z),
                    false
                );
            }
            let triangleShape = new Ammo.btGImpactMeshShape(ammoMesh);
            triangleShape.setMargin(0.01);
            triangleShape.setLocalScaling(new Ammo.btVector3(scale.x, scale.y, scale.z));
            triangleShape.updateBound();

            return triangleShape;

        }

        function updatePhysics(deltaTime) {

            // Step world
            physicsWorld.stepSimulation(deltaTime, 10);

            // Update rigid bodies
            for (let i = 0, il = rigidBodies.length; i < il; i++) {

                const objThree = rigidBodies[i];
                const objPhys = objThree.userData.physicsBody;
                const ms = objPhys.getMotionState();

                if (ms) {

                    ms.getWorldTransform(transformAux1);
                    const p = transformAux1.getOrigin();
                    const q = transformAux1.getRotation();
                    objThree.position.set(p.x(), p.y(), p.z());
                    objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

                    objThree.userData.collided = false;

                }

            }
        }

        function onWindowResize() {

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(window.innerWidth, window.innerHeight);

        }

        function animate() {

            requestAnimationFrame(animate);

            render();
            stats.update();

        }

        function render() {

            const deltaTime = clock.getDelta();
            if (allLoaded) {
                updatePhysics(deltaTime);
            }

            renderer.setRenderTarget(defaultTexture);
            renderer.clear();
            renderer.render(scene, camera);
            effectCompositer.uniforms["sceneDiffuse"].value = defaultTexture.texture;
            effectCompositer.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
            effectPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
            effectPass.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
            camera.updateMatrixWorld();
            effectPass.uniforms["projMat"].value = camera.projectionMatrix;
            effectPass.uniforms["viewMat"].value = camera.matrixWorldInverse;
            effectPass.uniforms["projViewMat"].value = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse.clone());
            effectPass.uniforms["projectionMatrixInv"].value = camera.projectionMatrixInverse;
            effectPass.uniforms["viewMatrixInv"].value = camera.matrixWorld;
            effectPass.uniforms["cameraPos"].value = camera.position;
            effectPass.uniforms['resolution'].value = new THREE.Vector2(clientWidth, clientHeight);
            effectPass.uniforms['time'].value = performance.now() / 1000;
            effectCompositer.uniforms["resolution"].value = new THREE.Vector2(clientWidth, clientHeight);
            hblur.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
            vblur.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
            vblur.uniforms["resolution"].value = new THREE.Vector2(clientWidth, clientHeight);
            hblur.uniforms["resolution"].value = new THREE.Vector2(clientWidth, clientHeight);
            composer.render();
        }

    });
}
main();