import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import TopDesignCard from "../components/TopDesignCard";
import { addDesignVote, getMyDesignVotes, getTopDesigns, removeDesignVote } from "../services/designVoteApi";
import "../styles/components/top-designs.css";

function TopDesigns() {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState([]);
  const [votes, setVotes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState("");

  const load = useCallback(async () => {
    const data = await getTopDesigns(10);
    setDesigns(data.designs || []);
  }, []);

  useEffect(() => {
    load().catch((error) => console.error(error)).finally(() => setLoading(false));
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return setVotes(new Set());
      try {
        const data = await getMyDesignVotes();
        setVotes(new Set(data.listingIds || []));
      } catch (error) {
        console.error("Oy durumu alınamadı:", error);
      }
    });
  }, [load]);

  async function vote(listingId, voted) {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }
    try {
      setVotingId(listingId);
      if (voted) await removeDesignVote(listingId);
      else await addDesignVote(listingId);
      const mine = await getMyDesignVotes();
      setVotes(new Set(mine.listingIds || []));
      await load();
    } catch (error) {
      alert(error.message);
    } finally {
      setVotingId("");
    }
  }

  return (
    <>
      <SEO title="Top 10 Tasarım | HediyeAlSat" description="Bu haftanın en çok oy alan dijital tasarımlarını keşfedin." />
      <Navbar />
      <main className="top-designs-page">
        <header className="top-designs-hero">
          <span>Haftalık sıralama</span>
          <h1>🏆 Top 10 Tasarım</h1>
          <p>Bu haftanın en çok oy alan dijital tasarımlarını inceleyin ve favorinize oy verin.</p>
        </header>
        {loading ? (
          <div className="top-design-state">Tasarımlar yükleniyor...</div>
        ) : designs.length ? (
          <div className="top-design-ranking">
            {designs.map((design) => (
              <TopDesignCard
                key={design.id}
                design={design}
                large
                voted={votes.has(design.id)}
                voting={votingId === design.id}
                onVote={vote}
              />
            ))}
          </div>
        ) : (
          <div className="top-design-state">Bu hafta henüz oy alan tasarım bulunmuyor.</div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default TopDesigns;
