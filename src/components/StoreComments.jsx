import "../styles/components/store-comments.css";

function StoreComments({

  yorumlar,

  yorum,

  setYorum,

  yorumGonder

}) {

  return (

    <section className="store-comments">

      <h2>

        💬 Mağaza Yorumları

      </h2>

      <div className="comments-card">

        {

          yorumlar.length === 0 ?

          <div className="no-comments">

            Henüz yorum yapılmamış.

          </div>

          :

          yorumlar.map((y) => (

            <div

              key={y.id}

              className="comment-item"

            >

              <div className="comment-header">

                <div className="comment-avatar">

                  👤

                </div>

                <div>

                  <h4>

                    {y.kullanici}

                  </h4>

                  {

                    y.tarih &&

                    <span>

                      {

                        y.tarih.toDate

                        ?

                        y.tarih.toDate().toLocaleDateString("tr-TR")

                        :

                        ""

                      }

                    </span>

                  }

                </div>

              </div>

              <p>

                {y.yorum}

              </p>

            </div>

          ))

        }

        <div className="comment-form">

          <textarea

            placeholder="Yorumunuzu yazın..."

            value={yorum}

            onChange={(e)=>setYorum(e.target.value)}

          />

          <button

            onClick={yorumGonder}

          >

            💬 Yorumu Gönder

          </button>

        </div>

      </div>

    </section>

  );

}

export default StoreComments;