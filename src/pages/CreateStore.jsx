import { useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const CLOUD_NAME = "dsncigidz";
const UPLOAD_PRESET = "zcqdaoum";

function CreateStore() {

  const navigate = useNavigate();

  const [yukleniyor,setYukleniyor]=useState(false);

  const [magaza,setMagaza]=useState({

    magazaAdi:"",
    telefon:"",
    sehir:"",
    aciklama:"",
    logo:"",
    kapak:""

  });



  async function logoYukle(e){

    const dosya=e.target.files[0];

    if(!dosya) return;

    const formData=new FormData();

    formData.append("file",dosya);
    formData.append("upload_preset",UPLOAD_PRESET);

    setYukleniyor(true);

    const cevap=await fetch(

      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,

      {

        method:"POST",

        body:formData

      }

    );

    const veri=await cevap.json();

    setYukleniyor(false);

    if(veri.secure_url){

      setMagaza({

        ...magaza,

        logo:veri.secure_url

      });

    }

  }




  async function kapakYukle(e){

    const dosya=e.target.files[0];

    if(!dosya) return;

    const formData=new FormData();

    formData.append("file",dosya);
    formData.append("upload_preset",UPLOAD_PRESET);

    setYukleniyor(true);

    const cevap=await fetch(

      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,

      {

        method:"POST",

        body:formData

      }

    );

    const veri=await cevap.json();

    setYukleniyor(false);

    if(veri.secure_url){

      setMagaza({

        ...magaza,

        kapak:veri.secure_url

      });

    }

  }
  async function kaydet(e){

    e.preventDefault();

    if(!auth.currentUser){

      alert("Önce giriş yap.");

      return;

    }

    if(!magaza.magazaAdi){

      alert("Mağaza adı giriniz.");

      return;

    }

    const uidQuery=query(
      collection(db,"magazalar"),
      where("sahipUid","==",auth.currentUser.uid)
    );

    const uidSnap=await getDocs(uidQuery);

    const emailQuery=query(
      collection(db,"magazalar"),
      where("sahip","==",auth.currentUser.email)
    );

    const emailSnap=uidSnap.empty
      ? await getDocs(emailQuery)
      : null;

    const legacySnap=uidSnap.empty && emailSnap?.empty
      ? await getDoc(doc(db,"magazalar",auth.currentUser.email))
      : null;

    if(!uidSnap.empty || !emailSnap?.empty || legacySnap?.exists()){

      alert("Bu hesapla zaten bir mağaza açılmış.");

      return;

    }

    await addDoc(

      collection(db,"magazalar"),

      {

        sahipUid:auth.currentUser.uid,

        sahip:auth.currentUser.email,

        magazaAdi:magaza.magazaAdi,

        telefon:magaza.telefon,

        sehir:magaza.sehir,

        aciklama:magaza.aciklama,

        logo:magaza.logo,

        kapak:magaza.kapak,

        puan:5,

        takipci:0,

        tarih:new Date()

      }

    );

    alert("🏪 Mağazan başarıyla oluşturuldu.");

    navigate("/magazalar");

  }

  return(

    <div className="page">

      <h1>🏪 Mağaza Oluştur</h1>

      <form className="ilan-form" onSubmit={kaydet}>

        <input
          placeholder="Mağaza Adı"
          value={magaza.magazaAdi}
          onChange={(e)=>setMagaza({...magaza,magazaAdi:e.target.value})}
        />

        <input
          placeholder="Telefon"
          value={magaza.telefon}
          onChange={(e)=>setMagaza({...magaza,telefon:e.target.value})}
        />

        <input
          placeholder="Şehir"
          value={magaza.sehir}
          onChange={(e)=>setMagaza({...magaza,sehir:e.target.value})}
        />

        <textarea
          placeholder="Mağaza Açıklaması"
          value={magaza.aciklama}
          onChange={(e)=>setMagaza({...magaza,aciklama:e.target.value})}
        />

        <h3>Logo</h3>

        <input
          type="file"
          accept="image/*"
          onChange={logoYukle}
        />

        {
          magaza.logo &&
          <img
            src={magaza.logo}
            width="120"
          />
        }

        <h3>Kapak Fotoğrafı</h3>

        <input
          type="file"
          accept="image/*"
          onChange={kapakYukle}
        />

        {
          magaza.kapak &&
          <img
            src={magaza.kapak}
            width="250"
          />
        }

        <br/><br/>

        <button disabled={yukleniyor}>

          {yukleniyor ? "Yükleniyor..." : "🏪 Mağazayı Oluştur"}

        </button>

      </form>

    </div>

  );

}

export default CreateStore;
