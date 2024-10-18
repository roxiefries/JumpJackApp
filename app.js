const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const joints = document.getElementById('joints');
 // Access the 'name' variable defined in the global scope
// Define a function to handle name input
let username;

function handleNameInput() {
    // Define a variable to store the name
     // Get the notification element
     const notification = document.getElementById('notification');
    // Add an event listener to the submit button
    document.getElementById('submit-button').addEventListener('click', function () {
        // Get the value entered in the textbox
        const nameInput = document.getElementById('name-input');
        username = nameInput.value;

        // Now, the 'name' variable holds the entered name
        //console.log('Name entered:', name);
         // Show the notification
         notification.style.display = 'block';
         console.log('Name in external script:', username);

        // You can perform further actions with the 'name' variable here
    });
}

// Call the function to set up the event listener
handleNameInput();
// You can use the 'name' variable in your external script as needed



let score = 0;

async function setupCamera() {
    video.width = 640;
    video.height = 480;
    const stream = await navigator.mediaDevices.getUserMedia({ 'video': true });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

function setupCanvas() {
    canvas.width = video.width;
    canvas.height = video.height;
}

async function loadModel() {
    return await posenet.load();
}

async function detectPose(net) {
    const pose = await net.estimateSinglePose(video, {
        flipHorizontal: true
    });
    drawPose(pose);
    listJoints(pose);
    requestAnimationFrame(() => detectPose(net));
    checkForJumpingJacksMove(pose);
    //drawHead(pose);


    //checkForProperSquat(pose);
}

function drawHead(pose) {
    const head = pose.keypoints.find(point => point.part === 'nose'); // You can use 'nose' or another keypoint to represent the head

    if (head && head.score > 0.8) {
        const x = head.position.x; // Use the original X coordinate without flipping
        const y = head.position.y;
        const radius = 60; // Adjust the radius as needed for the head size

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'blue'; // You can set the head color to any color you prefer
        ctx.fill();
    }
}


function drawPose(pose) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
     // Set the background color to black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(-1, 1); // Flip the canvas context horizontally
    ctx.translate(-canvas.width, 0); // Move the canvas context back into frame

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw lines connecting joints
    connectJoints(pose.keypoints, [
        ['leftHip', 'leftShoulder'], 
        ['leftElbow', 'leftShoulder'],
        ['leftElbow', 'leftWrist'],
        ['leftHip', 'leftKnee'],
        ['leftKnee', 'leftAnkle'],
        ['rightHip', 'rightShoulder'],
        ['rightElbow', 'rightShoulder'],
        ['rightElbow', 'rightWrist'],
        ['rightHip', 'rightKnee'],
        ['rightKnee', 'rightAnkle'],
        ['leftShoulder', 'rightShoulder'],
        ['leftHip', 'rightHip']
    ]);

    // Draw keypoints
    pose.keypoints.forEach(point => {
        if (point.score > 0.) {
            let mirroredX = canvas.width - point.position.x;
            ctx.beginPath();
            ctx.arc(mirroredX, point.position.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'aqua';
            ctx.fill();
        }
    });

    ctx.restore();

}

function connectJoints(keypoints, pairs) {
    const points = keypoints.reduce((acc, point) => {
        if (point.score > 0.8) {
            acc[point.part] = point;
        }
        return acc;
    }, {});

    pairs.forEach(pair => {
        if (points[pair[0]] && points[pair[1]]) {
            ctx.beginPath();
            ctx.moveTo(canvas.width - points[pair[0]].position.x, points[pair[0]].position.y);
            ctx.lineTo(canvas.width - points[pair[1]].position.x, points[pair[1]].position.y);
            ctx.strokeStyle = 'aqua';
            ctx.lineWidth = 10;
            ctx.stroke();
        }
    });
}





JumpingJacksMoveDetected = false;

function checkForJumpingJacksMove(pose) {
    const rightWrist = pose.keypoints.find(point => point.part === 'rightWrist');
    const rightEye = pose.keypoints.find(point => point.part === 'rightEye');
    const leftWrist = pose.keypoints.find(point => point.part === 'leftWrist');
    const leftEye = pose.keypoints.find(point => point.part === 'leftEye');

    const leftAnkle = pose.keypoints.find(point => point.part === 'leftAnkle');
    const rightAnkle = pose.keypoints.find(point => point.part === 'rightAnkle');
    const nose = pose.keypoints.find(point => point.part === 'nose');
    const rightKnee = pose.keypoints.find(p => p.part === 'rightKnee');
    const leftKnee = pose.keypoints.find(p => p.part === 'leftKnee');

    if (rightWrist && rightEye && leftWrist && leftEye && leftAnkle && rightAnkle && rightKnee && leftKnee ) {
        // Check if both wrists are above their respective eyes.
        const isRightHandUp = rightWrist.position.y < rightEye.position.y;
        const isLeftHandUp = leftWrist.position.y < leftEye.position.y;
        
        // Check if both ankle are wide and past knee position.
        const rightAnkleMore = rightAnkle.position.x > rightKnee.position.x
        const leftAnkleMore = leftAnkle.position.x < leftKnee.position.x

        // Check if all conditions are met.
        if (isRightHandUp && isLeftHandUp && rightAnkleMore && leftAnkleMore && !JumpingJacksMoveDetected) {
            incrementScore();
            JumpingJacksMoveDetected = true;
        } else if (!isRightHandUp && !isLeftHandUp && !rightAnkleMore && !leftAnkleMore) {
            JumpingJacksMoveDetected = false;
        }
    }
}


function incrementScore() {
    const scoreElement = document.getElementById('scoreDisplay');
    const currentScore = parseInt(scoreElement.textContent.split(':')[1]);
    const newScore = currentScore + 1;
    scoreElement.textContent = 'Score: ' + newScore;

    // Convert the new score to text
    const scoreText = newScore.toString();

    // Use text-to-speech to announce the score
    announceScore(scoreText);
      // Check for milestone scores and announce accordingly
      const scoreMilestone = document.getElementById('scoreMilestone'); // Assuming you have a div with ID 'scoreMilestone'

      if (newScore === 10) {
        enableImage(newScore)
          announceMilestone('You nailed those first 10 jumping jacks! Ready to take it up a 100?' + ' ' + username);
           scoreMilestone.textContent = "You nailed those first 10 jumping jacks! Ready to take it up a 100?" + ' ' + username ;
 
       } else if (newScore === 20) {
        enableImage(newScore)

          announceMilestone("20 jumping jacks down, you're jumping ahead of the pack!"+ ' ' + username);
          scoreMilestone.textContent = "20 jumping jacks down, you're jumping ahead of the pack!"+ ' ' + username;
      } else if (newScore === 30) {
        enableImage(newScore)

          announceMilestone("30 jumping jacks? You're jumping into fitness like a pro!"+ ' ' + username);
          scoreMilestone.textContent = "30 jumping jacks? You're jumping into fitness like a pro!"+ ' ' + username;
      } else if (newScore === 40) {
        enableImage(newScore)

          announceMilestone("40 jumping jacks – that's jumping your way to success!"+ ' ' + username);
          scoreMilestone.textContent = "40 jumping jacks – that's jumping your way to success!"+ ' ' + username;
      } else if (newScore === 50) {
        enableImage(newScore)

          announceMilestone("50 jumping jacks, halfway to jumping legend status!"+ ' ' + username);
          scoreMilestone.textContent = "50 jumping jacks, halfway to jumping legend status!"+ ' ' + username;
      } else if (newScore === 60) {
        enableImage(newScore)

          announceMilestone("60 jumping jacks – you've reached the jumping pinnacle!"+ ' ' + username);
          scoreMilestone.textContent = "60 jumping jacks – you've reached the jumping pinnacle!"+ ' ' + username;
      } else if (newScore === 70) {
        enableImage(newScore)

          announceMilestone("70 jumping jacks – you're unstoppable!");
          scoreMilestone.textContent = "70 jumping jacks – you're unstoppable!"+ ' ' + username;
      } else if (newScore === 80) {
        enableImage(newScore)

          announceMilestone("80 jumping jacks – you're a jumping superstar!"+ ' ' + username);
          scoreMilestone.textContent = "80 jumping jacks – you're a jumping superstar!"+ ' ' + username;
      } else if (newScore === 90) {
        enableImage(newScore)

          announceMilestone("90 jumping jacks – the jumping master!"+ ' ' + username);
          scoreMilestone.textContent = "90 jumping jacks – the jumping master!"+ ' ' + username;
      } else if (newScore === 100) {
        enableImage(newScore)
        var congratsImage = document.getElementById('congrats');
        var congratsText= document.getElementById('congrats-text');
        congratsText.textContent = username + " Completed 100 Jumping Jacks Scored by AI, Take The Challenge Now!" ;
        congratsImage.style.display = 'block'; // Show the image
          announceMilestone("Congratulations! You've completed 100 jumping jacks!"+ ' ' + username);
          scoreMilestone.textContent = "Congratulations! You've completed 100 jumping jacks!"+ ' ' + username;
      }
      
}

function enableImage(newScore) {
    var rewardImage = document.getElementById('reward' + newScore);
    if (rewardImage) {
        rewardImage.style.display = 'block'; // Show the image
    }
}

 
 
function announceScore(text) {
    const announcement = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(announcement);
}
function announceMilestone(text) {
    const milestoneAnnouncement = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(milestoneAnnouncement);
  }

function listJoints(pose) {
    joints.innerHTML = pose.keypoints
        .filter(point => point.score > 0.8)
        .map(point => `${point.part}: (${point.position.x.toFixed(2)}, ${point.position.y.toFixed(2)})`)
        .join('<br>');
}



async function main() {
    await setupCamera();
    video.play();
    setupCanvas();
    

    const net = await loadModel();
    detectPose(net);

}

main();
