import { useEffect } from "react";
import "../styles/components/lightbox.css";

function Lightbox({

open,
items,
index,
setIndex,
onClose

}){

useEffect(()=>{

function esc(e){

if(e.key==="Escape") onClose();

if(e.key==="ArrowRight")
next();

if(e.key==="ArrowLeft")
prev();

}

window.addEventListener("keydown",esc);

return ()=>window.removeEventListener("keydown",esc);

},[index]);

if(!open) return null;

const aktif=items[index];

function next(){

setIndex(

index===items.length-1

?0

:index+1

);

}

function prev(){

setIndex(

index===0

?items.length-1

:index-1

);

}
  return (

    <div className="lightbox">

      <div className="lightbox-overlay" onClick={onClose}></div>

      <button
        className="lb-close"
        onClick={onClose}
      >
        ✕
      </button>

      <button
        className="lb-prev"
        onClick={prev}
      >
        ❮
      </button>

      <div className="lb-content">

        {

          aktif.endsWith(".mp4") ||

          aktif.endsWith(".webm") ||

          aktif.includes("/video/")

          ? (

            <video
              src={aktif}
              controls
              autoPlay
              className="lb-media"
            />

          )

          : (

            <img
              src={aktif}
              alt=""
              className="lb-media"
            />

          )

        }

      </div>

      <button
        className="lb-next"
        onClick={next}
      >
        ❯
      </button>

    </div>

  );

}

export default Lightbox;