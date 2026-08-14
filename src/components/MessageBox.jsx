import "../styles/components/message-box.css";

function MessageBox({

  mesaj,

  setMesaj,

  mesajGonder

}){

return(

<div className="message-card">

<h3>

💬 Satıcıya Sor

</h3>

<p className="message-text">

Ürün hakkında satıcıya doğrudan soru sorabilirsiniz.

</p>

<textarea

placeholder="Örneğin:
Ürün sıfır mı?
Kargo ne zaman çıkar?
Pazarlık olur mu?"

value={mesaj}

onChange={(e)=>setMesaj(e.target.value)}

/>

<button

className="message-btn"

onClick={mesajGonder}

>

📨 Mesaj Gönder

</button>

</div>

);

}

export default MessageBox;