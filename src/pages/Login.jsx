import { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";

import {
  Link,
  useNavigate
} from "react-router-dom";

import "../App.css";

function Login(){

  const navigate = useNavigate();

  const [email,setEmail]=useState("");
  const [sifre,setSifre]=useState("");
  const [beniHatirla,setBeniHatirla]=useState(true);

  const [sonKullanicilar,setSonKullanicilar]=useState(
    JSON.parse(localStorage.getItem("sonKullanicilar")) || []
  );



  async function giris(){

    if(!email || !sifre){

      alert("Email ve şifre giriniz.");

      return;

    }

    try{

      await setPersistence(

        auth,

        beniHatirla
          ? browserLocalPersistence
          : browserSessionPersistence

      );

      await signInWithEmailAndPassword(

        auth,

        email,

        sifre

      );

      let liste =
      JSON.parse(localStorage.getItem("sonKullanicilar")) || [];

      liste = liste.filter(x=>x!==email);

      liste.unshift(email);

      liste = liste.slice(0,5);

      localStorage.setItem(
        "sonKullanicilar",
        JSON.stringify(liste)
      );

      setSonKullanicilar(liste);

      alert("✅ Giriş başarılı");

      navigate("/");

    }

    catch(error){

      alert(error.message);

    }

  }



  async function kayit(){

    if(!email || !sifre){

      alert("Email ve şifre giriniz.");

      return;

    }

    try{

      const userCredential = await createUserWithEmailAndPassword(
  auth,
  email,
  sifre
);

await setDoc(doc(db, "users", userCredential.user.uid), {
  uid: userCredential.user.uid,
  email: userCredential.user.email,
  createdAt: serverTimestamp()
});

      alert("🎉 Hesabınız oluşturuldu.");

      navigate("/");

    }

    catch(error){

      alert(error.message);

    }

  }



  async function sifremiUnuttum(){

    if(!email){

      alert("Önce e-posta adresinizi yazınız.");

      return;

    }

    try{

      await sendPasswordResetEmail(

        auth,

        email

      );

      alert("📧 Şifre sıfırlama bağlantısı gönderildi.");

    }

    catch(error){

      alert(error.message);

    }

  }



  return(

    <div className="page">

      <div className="login-box">

        <h1>🔐 Giriş Yap</h1>

        {sonKullanicilar.length>0 && (

          <div className="last-users">

            <h3>Son Kullanıcılar</h3>

            {

            sonKullanicilar.map((mail,index)=>(

              <div

                key={index}

                className="last-user"

                onClick={()=>setEmail(mail)}

              >

                👤 {mail}

              </div>

            ))

            }

          </div>

        )}

        <input

          type="email"

          placeholder="Email"

          value={email}

          onChange={(e)=>setEmail(e.target.value)}

        />



        <input

          type="password"

          placeholder="Şifre"

          value={sifre}

          onChange={(e)=>setSifre(e.target.value)}

        />



        <label
          style={{
            display:"flex",
            alignItems:"center",
            gap:"8px",
            marginTop:"15px",
            marginBottom:"20px",
            cursor:"pointer"
          }}
        >

          <input

            type="checkbox"

            checked={beniHatirla}

            onChange={(e)=>setBeniHatirla(e.target.checked)}

          />

          Beni Hatırla

        </label>



        <button
          className="login-btn"
          onClick={giris}
        >

          🔑 Giriş Yap

        </button>



        <button
          className="register-btn"
          onClick={kayit}
        >

          👤 Üye Ol

        </button>



        <button
          className="forgot-btn"
          onClick={sifremiUnuttum}
        >

          🔒 Şifremi Unuttum

        </button>

        <br/><br/>

        <Link to="/">

          🏠 Ana Sayfaya Dön

        </Link>

      </div>

    </div>

  );

}

export default Login;