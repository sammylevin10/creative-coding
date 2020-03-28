/*
e.motion by Sammy Levin

Version 2.1

Documentation:
https://docs.google.com/presentation/d/1s3jN5SL4Sz0TlqNlwcAYfkINONdifAuRclMfwm1zkUU/edit?usp=sharing

Online Hosting:
https://pedantic-torvalds-2e70cc.netlify.com/

References:
> Portrait Painter by Jason Labbe (jasonlabbe3d.com)
  > Streamlined to exclude unnecessary computation
  > Ported Processing sketch to p5.js
  > Added webcam functionality
  > Modified paintStroke function
  > Interfaced with face-api.js
> Face Detection JavaScript by WebDevSimplified (https://www.youtube.com/watch?v=CVClHLwv-4I)
  > Streamlined to exclude unnecessary computation
  > Utilized model-loading promise function
  > Utilized startVideo function
  > Modified setInterval function
  > Interfaced with p5js

Libraries and APIs:
> face-api.js
  > https://azure.microsoft.com/en-us/services/cognitive-services/face/
  > https://github.com/justadudewhohacks/face-api.js/
> TensorFlow.js
  >https://www.tensorflow.org/js
> p5.js
  >https://p5js.org/
*/

//Video element for face-api.js processing
const video = document.getElementById('video')

//Video element for p5.js (previous video element is not cross-compatible between face-api and p5)
let capture;

//Variables for time delay functions
let lastTime = 0;
let refreshDelay = 50;

//Facial expression attributes
let expressionData;
let happy;
let neutral;
let angry;
let sad;
let turbulence;
let rbf;

//Load relevant face-api detection models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo)

//Initialize video element
function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => video.srcObject = stream,
    err => console.error(err)
  )
}

//Get expression data from face-api and store as a turbulence value
video.addEventListener('play', () => {
  setInterval(async () => {
    expressionData = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
    happy = -0.5*expressionData[0].expressions.happy;
    neutral = -0.25*expressionData[0].expressions.neutral;
    angry = 0.5*expressionData[0].expressions.angry;
    sad = 0.5*expressionData[0].expressions.sad;
    turbulence = happy+neutral+angry+sad+0.5;
  }, refreshDelay)
})

//Initializes canvas, frameRate, capture, background
function setup() {
  noFill();
  frameRate(60);
  createCanvas(window.innerWidth+50, window.innerHeight+50);
  capture = createCapture(VIDEO);
  capture.hide();
  frameRate(300);
  background(0);
}

//Create a single brush stroke for a given pixel and turbulence
function paintStroke(strokeLength, strokeThickness, luma, mappedAlpha) {
  //Two dimensional gradient mapping for dimensions luma and turbulence
  let turbulentDark = color(27,60,90,mappedAlpha);
  let turbulentLight = color(214,103,81,mappedAlpha);
  let neutralDark = color(81,81,107,mappedAlpha);
  let neutralLight = color(202,156,99,mappedAlpha);
  let peacefulDark = color(9,13,72,mappedAlpha);
  let peacefulLight = color(225,114,55,mappedAlpha);
  let currColor;

  //Maps from peaceful to neutral color palettes
  if (turbulence<=0.25){
    let currDark = lerpColor(peacefulDark,neutralDark,turbulence);
    let currLight = lerpColor(peacefulLight,neutralLight,turbulence);
    currColor = lerpColor(currDark,currLight,map(luma,0,255,0,1));
  }
  //Maps from neutral to turbulent color palettes
  else {
    let currDark = lerpColor(neutralDark,turbulentDark,turbulence);
    let currLight = lerpColor(neutralLight,turbulentLight,turbulence);
    currColor = lerpColor(currDark,currLight,map(luma,0,255,0,1));
  }

  //Determines if the stroke is curved. A straight line is 0.
  let tangent1 = 0;
  let tangent2 = 0;
  let odds = random(1.0);
  let stepLength = strokeLength/2;
  stroke(currColor);

  if(odds < 0.7) {
    tangent1 = random(-strokeLength, strokeLength);
    tangent2 = random(-strokeLength, strokeLength);
  }
  //Turbulence threshold for generating curves
  if (turbulence>0.2) {
    // Draw a curve
    strokeWeight(strokeThickness);
    rotate(radians(random(-90, 90)));
    curve(tangent1, -stepLength*2, 0, -stepLength, 0, stepLength, tangent2, stepLength*2);
  }
  else {
    //Plot a single point
    strokeWeight(strokeThickness*3);
    point(0,0)
  }
  let z = 1;
}

//Prints all expressions to console
function printExpression() {
    print("Happy: " + happy*-2);
    print("Neutral: " + neutral*(-0.5));
    print("Angry: " + angry*2);
    print("Sad: " + sad*2);
    print("Turbulence: " + turbulence);
}

function draw() {
  noFill();

  //Print expression data on interval
  let now = millis();
  let elapsedTime = now-lastTime;
  if (elapsedTime>=refreshDelay) {
    lastTime = now;
    if (expressionData) {
      printExpression();
    }
    else {
      print("DATA UNDEFINED");
    }
  }

  //Wait until intro quote is done
  if (millis()>=12000) {
    translate(width/2, height/2);
    capture.loadPixels();
    let step = 1;

    //Parse each pixel retrieved from webcam
    for (let y = 0; y < capture.height; y+=step) {
      for (let x = 0; x < capture.width; x+=step) {
        let odds = random(1000);

        if (odds < 1) {
          let i = (x + y * capture.width) * 4;
          let r = capture.pixels[i];
          let g = capture.pixels[i+1];
          let b = capture.pixels[i+2];
          let luma = 0.299*r+0.587*g+0.114*b;

          if (expressionData) {
            //Turbulence mapped
            let mappedOdds = map(turbulence,0,1,150,10000)
            let mappedLength = map(turbulence,0,1,10,100)
            let mappedWidth = map(turbulence,0,1,5,35)
            let mappedAlpha = map(-1*turbulence,-1,0,15,70)

            //Place brush stroke
            push();
            translate(capture.width-x-capture.width/2, y-capture.height/2);
            paintStroke(random(mappedLength-30,mappedLength), random(mappedWidth-2,mappedWidth),luma,mappedAlpha);
            pop();
          }
        }
      }
    }
  }
  else {
    //Display Immmanuel Kant text
    let constrainedFrame = constrain(millis(),0,10000);
    let textAlpha = map(constrainedFrame,5000,10000,0,255);
    let message1 = "\"All perception is colored by emotion\"";
    let message2 = "                       "+'-'+"Immanuel Kant";
    textSize(20);
    textAlign(CENTER);
    fill(255,255,255,textAlpha);
    textFont('Georgia');
    text(message1,width/2,height/2-40)
    text(message2,width/2,height/2+40)
  }
}
