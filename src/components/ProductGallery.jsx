import { useState, useRef } from "react";
import Lightbox from "./Lightbox";
import "../styles/components/product-gallery.css";

function ProductGallery({ ilan }) {

  const resimler =
    ilan.resimler?.length > 0
      ? ilan.resimler
      : (ilan.resim ? [ilan.resim] : []);

  const [aktifResim, setAktifResim] = useState(
    resimler[0] || ""
  );

  const [lightboxAcik, setLightboxAcik] = useState(false);

  const [lightboxIndex, setLightboxIndex] = useState(0);

  const imageRef = useRef(null);

  return (
    <>

      <div className="gallery">

        <div className="gallery-thumbs">

          {ilan.video && (

            <div
              className={
                aktifResim === "__video__"
                  ? "thumb-video active"
                  : "thumb-video"
              }
              onClick={() => setAktifResim("__video__")}
            >
              ▶
            </div>

          )}

          {resimler.map((foto, index) => (

            <img
              key={index}
              src={foto}
              alt={ilan.baslik}
              className={
                aktifResim === foto
                  ? "thumb active"
                  : "thumb"
              }
              onClick={() => setAktifResim(foto)}
            />

          ))}

        </div>

        <div className="gallery-main">

          {

            aktifResim === "__video__"

            ?

            (

              <video
                src={ilan.video}
                controls
                className="main-photo"
              />

            )

            :

            (

              <img

                ref={imageRef}

                src={aktifResim}

                alt={ilan.baslik}

                className="main-photo zoom-image"

                onClick={() => {

                  setLightboxIndex(

                    resimler.indexOf(aktifResim)

                  );

                  setLightboxAcik(true);

                }}

                onMouseMove={(e)=>{

                  const rect=e.target.getBoundingClientRect();

                  const x=((e.clientX-rect.left)/rect.width)*100;

                  const y=((e.clientY-rect.top)/rect.height)*100;

                  e.target.style.transformOrigin=`${x}% ${y}%`;

                  e.target.style.transform="scale(2)";

                }}

                onMouseLeave={(e)=>{

                  e.target.style.transform="scale(1)";

                  e.target.style.transformOrigin="center";

                }}

              />

            )

          }

          <div className="photo-count">

            {ilan.video && "🎥 Video + "}

            📷 {resimler.length} Fotoğraf

          </div>

        </div>

      </div>

      <Lightbox

        open={lightboxAcik}

        items={[
          ...resimler,
          ...(ilan.video ? [ilan.video] : [])
        ]}

        index={lightboxIndex}

        setIndex={setLightboxIndex}

        onClose={() => setLightboxAcik(false)}

      />

    </>
  );

}

export default ProductGallery;