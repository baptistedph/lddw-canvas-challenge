import './style.css'
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  Clock,
  AmbientLight,
  DirectionalLight,
  ShaderMaterial,
  TextureLoader,
  DoubleSide,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// on récupère le canvas dans notre html
const canvas = document.querySelector('#canvas')

// on initialise les variables
let scene, camera, renderer
let flag
let ambientLight, directionalLight
let controls
let textureLoader, flagTexture

const init = () => {
  // on crée la scène
  scene = new Scene()

  // on ajoute une caméra
  camera = new PerspectiveCamera(
    75, // field of view
    window.innerWidth / window.innerHeight, // aspect
    0.1, // near
    1000, // far
  )
  camera.position.z = 3
  scene.add(camera)

  // on crée un renderer
  renderer = new WebGLRenderer({
    canvas, // on dit que le canvas est l'élément canvas récupéré dans notre html un peu plus haut
    antialias: true, // on applique l'antialiasing ce qui va créer un rendu plus net de notre drapeau
    alpha: true, // on dit à notre canvas d'être transparent
  })
  // on donne une taille à notre renderer (concrètement on dit à notre canvas de couvrir toute la page)
  renderer.setSize(window.innerWidth, window.innerHeight)

  // on setup les controls pour bouger le drapeau
  controls = new OrbitControls(camera, canvas)
  // on empêche l'utilisateur de zoomer sur le drapeau
  controls.enableZoom = false

  // on charge la texture du drapeau
  textureLoader = new TextureLoader()
  flagTexture = textureLoader.load('./texture.jpeg')

  // on crée le drapeau
  flag = new Mesh(
    // le drapeau a une width de 3 et une height de 2, avec 64 segments de part et d'autre
    new PlaneGeometry(3, 2, 64, 64),
    // on rentre dans la partie SHADEEEERSSS, un peu complexe mais je essayer de t'expliquer du mieux que je peux
    new ShaderMaterial({
      // on fait en sorte de pouvoir voir le drapeau des deux cotés
      side: DoubleSide,
      // on crée des uniforms que l'on va pouvoir récupérer dans nos shaders
      uniforms: {
        // le temps est par défaut null et actualisé dans la fonction render à chaque frame
        uTime: {
          value: null,
        },
        // on ajoute la texture que l'on a chargé un peu avant
        uTexture: {
          value: flagTexture,
        },
      },
      vertexShader: `
        // on récupère le temps passé via le uniform
        uniform float uTime;

        // on crée un vec2 vUv, qui va permettre de passer les uvs dans le fragment shader
        varying vec2 vUv;

        // on initialise également l'élévation qui va permettre d'imiter les ombres
        varying float vElevation;

        // la fonction main est appelée automatiquement par la carte graphique
        void main() {
          
          // on récupère la position de chaque "point" du drapeau
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          
          // on crée la fréquence des ondulations du drapeau basée sur la fonction sinus (c'est pour ça qu'on a cette forme de vague) et le temps va permettre d'animer le drapeau
          float frequency = sin(modelPosition.x * 3.0 + uTime * 2.0);
          
          // chaque "point" du drapeau va donc être élevé à une certaine hauteur en fonction de la valeur du sinus de ce "point"
          modelPosition.z += frequency * 0.2;

          // même chose pour l'élévation, mais un peu plus bas pour atténuer l'ombre
          float elevation = frequency * 0.08;

          // et on applique les transformations sur le drapeau
          gl_Position = projectionMatrix * viewMatrix * modelPosition;

          // on passe les uvs au fragment shader
          vUv = uv;

          // de même pour l'élévation
          vElevation = elevation;
        }
      `,
      fragmentShader: `
        // on récupère la texture passée dans les uniforms
        uniform sampler2D uTexture;

        // on récupère les uvs provenants du vertex shader
        varying vec2 vUv;

        // pareil pour l'élévation
        varying float vElevation;

        void main() {
          // on récupère la couleur de chaque pixel
          vec4 textureColor = texture2D(uTexture, vUv);

          // on noircit légèrement la couleur de chaque pixel en fonction de leur élévation, ce qui va crée un semblant d'ombre sur le drapeau
          textureColor.rgb *= vElevation * 2.0 + 0.5;
          
          // et on applique chaque pixel de la texture sur le drapeau
          gl_FragColor = textureColor;
        }
      `,
    }),
  )
  scene.add(flag)

  // on ajoute une lumière ambiante (sinon on voit rien)
  ambientLight = new AmbientLight('white', 0.8)
  scene.add(ambientLight)
  // et on rajoute une autre lumière qui va éclairer vers une position définie (comme un projecteur en gros)
  directionalLight = new DirectionalLight('white', 1)
  // on dit à la lumière de pointer vers x = 0, y = 0, et z = 3, en gros juste devant nos yeux
  directionalLight.position.set(0, 0, 3)
  scene.add(directionalLight)
}

const clock = new Clock()
let elapsedTime = 0

// ça c'est la fonction qui va être exécutée à chaque frame
const render = () => {
  // on rappelle la fonction render à chaque frame
  requestAnimationFrame(render)
  // on récupère le temps passé depuis le dernier refresh
  elapsedTime = clock.getElapsedTime()
  // on update le uniform temps en fonction du temps passé depuis le dernier refresh
  flag.material.uniforms.uTime.value = elapsedTime
  // et on re-renderer à chaque frame
  renderer.render(scene, camera)
}

// On redimensionne le canvas lorsque l'on change la taille de l'écran
window.addEventListener('resize', () => {
  // on réinitialise la taille du renderer
  renderer.setSize(window.innerWidth, window.innerHeight)
  // on réinitialise le ratio de la caméra
  camera.aspect = window.innerWidth / window.innerHeight
  // et on update la matrice de projection de la caméra
  camera.updateProjectionMatrix()
})

init()
render()
