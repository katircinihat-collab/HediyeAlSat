import "../styles/components/store-comments.css";
import { formatPublicCommentDate, publicUserName } from "../utils/publicUserName";

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

                    {publicUserName(y)}

                  </h4>

                  {formatPublicCommentDate(y.tarih) && (
                    <span>{formatPublicCommentDate(y.tarih)}</span>
                  )}

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
