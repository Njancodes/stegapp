import init, {let_encode, let_decode} from './pkg/stegapp.js';

const imageUpload = document.getElementById('image-upload');
const encodeBtn = document.getElementById('encode-btn');
const decodeBtn = document.getElementById('decode-btn');
const canvas = document.getElementById('image-canvas');
canvas.hidden = true;
const ctx = canvas.getContext('2d');

let orgImageData = null
let file_name

async function run(){
    await init();


    imageUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0]
        if(document.body.contains(document.querySelector(".upload-warning"))){
            let selectEle = document.querySelector('div.select');
            selectEle.removeChild(document.querySelector(".upload-warning"))
        }
        file_name = file.name
        const show_file_name = document.getElementById("file_name");
        show_file_name.textContent = file_name;
        if (!file) return;
        const image = new Image();
        image.src = URL.createObjectURL(file);
        image.onload = ()=>{

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.height = image.height;
            canvas.width = image.width;
            ctx.drawImage(image, 0, 0, image.width, image.height);
            orgImageData = ctx.getImageData(0, 0, image.width, image.height)
        }
    })

    encodeBtn.addEventListener('click', (event)=>{
        console.log("Encode");
        const encodeContainer = document.createElement('div');
        const spanFileName = document.querySelector('span#file_name');
        const pwdInputEle = document.createElement('input');
        if(document.body.contains(document.querySelector(".decode-container"))){
            document.body.removeChild(document.querySelector(".decode-container"))
        }

        const submitBtn = document.createElement('button');
         if(!document.body.contains(document.querySelector(".encode-container")) && file_name != undefined){
            const hrLine = document.createElement('hr');
            hrLine.style = "border: 2px solid #D64933;width: 100%;"

            encodeContainer.className = "encode-container"

            const infoEle = document.querySelector('.info')

            const spanFileName = document.createElement('span');
            spanFileName.textContent = `Writing to ${file_name}`;
            spanFileName.style = "font-weight: bolder;";
            const secretLabelEle = document.createElement('label');
            secretLabelEle.id = "secret-label"
            secretLabelEle.textContent = "Secret Message";
            const secretInputEle = document.createElement('input');
            secretInputEle.type = "text";
            secretInputEle.placeholder = "Message To Hide";
            secretInputEle.id = "secret-input";


            const pwdLabelEle = document.createElement('label');
            pwdLabelEle.id = "pwd-label"
            pwdLabelEle.textContent = "Enter Password";
            pwdInputEle.type = "text";
            pwdInputEle.placeholder = "Protect The Message";
            pwdInputEle.id = "pwd-input"; 

            secretInputEle.addEventListener('keydown',(ev)=>{
                if(ev.key == "Enter"){
                    pwdInputEle.focus();
                }
            })

            submitBtn.id = "submit-btn"
            submitBtn.textContent = "Write To Image & Download"
    

            secretLabelEle.appendChild(secretInputEle)
            pwdLabelEle.appendChild(pwdInputEle)
            encodeContainer.appendChild(hrLine);
            encodeContainer.appendChild(spanFileName);
            encodeContainer.appendChild(secretLabelEle);
            encodeContainer.appendChild(pwdLabelEle);
            encodeContainer.appendChild(submitBtn)

            document.body.insertBefore(encodeContainer, infoEle)
        }else if(file_name == undefined){
            console.log("Add")
            if(document.body.contains(document.querySelector(".upload-warning"))){
                let selectEle = document.querySelector('div.select');
                selectEle.removeChild(document.querySelector(".upload-warning"))
            }
            let selectEle = document.querySelector('div.select');
            let h2Ele = document.createElement('h2');
            h2Ele.className = 'upload-warning'
            h2Ele.textContent = "Please Upload an Image"
            selectEle.appendChild(h2Ele);
        }

        
        const secretInput = document.getElementById('secret-input');
        const pwdInput = document.getElementById('pwd-input');

        pwdInputEle.addEventListener('keydown',(ev)=>{
            if(ev.key == "Enter"){
                encode(secretInput.value, pwdInput.value);
                encodeContainer.remove();
                spanFileName.textContent = "No Image";
            }
        })

        submitBtn.addEventListener('click', ()=>{
            encode(secretInput.value, pwdInput.value);
            encodeContainer.remove();
            spanFileName.textContent = "No Image";
        })

        
    })

    decodeBtn.addEventListener('click', () => {
        console.log("Decode");
        const submitBtn = document.createElement('button');
        const pwdInputEle = document.createElement('input');
        if(document.body.contains(document.querySelector(".encode-container"))){
            document.body.removeChild(document.querySelector(".encode-container"))
        }

        if(!document.body.contains(document.querySelector(".decode-container")) && file_name != undefined){
            const hrLine = document.createElement('hr');
            hrLine.style = "border: 2px solid #D64933;width: 100%;"


            const infoEle = document.querySelector('.info')

            const decodeContainer = document.createElement('div');
            decodeContainer.className = "decode-container"


            const spanFileName = document.createElement('span');
            spanFileName.textContent = `Reading from ${file_name}`;
            spanFileName.style = "font-weight: bolder;";
            const secretLabelEle = document.createElement('label');
            secretLabelEle.id = "secret-label"
            secretLabelEle.textContent = "Secret Message";


            const pwdLabelEle = document.createElement('label');
            pwdLabelEle.id = "pwd-label"
            pwdLabelEle.textContent = "Enter Password";
            pwdInputEle.type = "text";
            pwdInputEle.placeholder = "Enter The Password";
            pwdInputEle.id = "pwd-input"; 
            pwdInputEle.value = "";




            pwdLabelEle.appendChild(pwdInputEle)

            submitBtn.id = "submit-btn"
            submitBtn.textContent = "Read Message From Image"
    

            decodeContainer.appendChild(hrLine);
            decodeContainer.appendChild(spanFileName);
            decodeContainer.appendChild(pwdLabelEle);
            decodeContainer.appendChild(submitBtn);
            decodeContainer.appendChild(secretLabelEle);


            
            document.body.insertBefore(decodeContainer, infoEle)
        }else if(file_name == undefined){
            console.log("Add")
            if(document.body.contains(document.querySelector(".upload-warning"))){
                let selectEle = document.querySelector('div.select');
                selectEle.removeChild(document.querySelector(".upload-warning"))
            }
            let selectEle = document.querySelector('div.select');
            let h2Ele = document.createElement('h2');
            h2Ele.className = 'upload-warning'
            h2Ele.textContent = "Please Upload an Image"
            //selectEle.appendChild(h2Ele);
            selectEle.insertAdjacentElement('beforeend', h2Ele)
        }

        const secretLabelEle = document.getElementById('secret-label');        
        const pwdInput = document.getElementById('pwd-input');
 

        pwdInputEle.addEventListener('keydown',(ev)=>{
            if(ev.key == "Enter"){
                let message = decode(pwdInput.value);
                if(message == ""){
                    secretLabelEle.textContent = "Password Is Incorrect";
                }else{
                    secretLabelEle.textContent = `Secret Message: ${message}`;
                }
            }
        })

        submitBtn.addEventListener('click', ()=>{
            let message = decode(pwdInput.value);
            if(message == ""){
                secretLabelEle.textContent = "Password Is Incorrect";
            }else{
                secretLabelEle.textContent = `Secret Message: ${message}`;
            }
        })


    })
}

function decode(pwd){
    if (!orgImageData) return;



    const inputImageData = new Uint8Array(orgImageData.data.buffer);
    const output = let_decode(inputImageData, canvas.width, canvas.height,pwd);
    return output;
}

function encode(secret, pwd){
    if (!orgImageData) return;

    const inputImageData = new Uint8Array(orgImageData.data.buffer);

    const outputImageData = new Uint8Array(let_encode(inputImageData, canvas.width, canvas.height, secret, pwd));
    const outputImage = new ImageData(new Uint8ClampedArray(outputImageData), canvas.width, canvas.height);

    canvas.width = outputImage.width;
    canvas.height = outputImage.height;
    ctx.putImageData(outputImage, 0, 0);

    var image = new Image();
    image.src = canvas.toDataURL();

    var anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = "END.png";
    anchor.click();


}

document.addEventListener("DOMContentLoaded", run);

