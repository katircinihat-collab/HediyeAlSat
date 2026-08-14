function AddressForm({

adres,

setAdres,

faturaAyni,

setFaturaAyni

}){

function degistir(e){

setAdres({

...adres,

[e.target.name]:e.target.value

});

}

return(

<div className="address-box">

<h2>

📦 Teslimat Adresi

</h2>

<div className="form-group">

<label>

Ad Soyad

</label>

<input

name="adSoyad"

value={adres.adSoyad}

onChange={degistir}

placeholder="Ad Soyad"

/>

</div>

<div className="form-group">

<label>

Telefon

</label>

<input

name="telefon"

value={adres.telefon}

onChange={degistir}

placeholder="05xx xxx xx xx"

/>

</div>

<div className="form-group">

<label>

Adres

</label>

<textarea

name="adres"

rows="4"

value={adres.adres}

onChange={degistir}

placeholder="Mahalle, Sokak, Apartman No..."

>

</textarea>

</div>

<div className="address-row">

<div className="form-group">

<label>

İl

</label>

<input

name="il"

value={adres.il}

onChange={degistir}

placeholder="İl"

/>

</div>

<div className="form-group">

<label>

İlçe

</label>

<input

name="ilce"

value={adres.ilce}

onChange={degistir}

placeholder="İlçe"

/>

</div>

</div>

<div className="invoice-check">

<label>

<input

type="checkbox"

checked={faturaAyni}

onChange={()=>

setFaturaAyni(

!faturaAyni

)

}

/>

Teslimat adresi ile fatura adresi aynı.

</label>

</div>

</div>

);

}

export default AddressForm;