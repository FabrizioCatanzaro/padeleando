import { useEffect, useState } from 'react';
import { Instagram, Plus, Trash2, Gem } from 'lucide-react';
import { api } from '../../utils/api';
import Btn from '../shared/Btn';
import Modal from '../shared/Modal';
import PremiumModal from '../shared/PremiumModal';

const MAX_POSTS = 6;

/**
 * Posts de Instagram en la galería del torneo (2026-11-09). El organizador pega
 * el link de un post público y se muestra embebido con el iframe de Instagram:
 * el post entero, con su carrusel. Premium del dueño de la categoría.
 */
export default function InstagramPosts({ tournamentId, isOwner = false, isPremium = false }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl]         = useState('');
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showPremium, setShowPremium] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.photos.instagram(tournamentId)
      .then((list) => { if (alive) setPosts(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setPosts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tournamentId]);

  async function agregar(e) {
    e.preventDefault();
    if (!isPremium) { setShowPremium(true); return; }
    if (!url.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const post = await api.photos.addInstagram(tournamentId, url.trim());
      setPosts((ps) => [post, ...ps]);
      setUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function borrar(post) {
    setConfirmDel(null);
    try {
      await api.photos.deleteInstagram(tournamentId, post.id);
      setPosts((ps) => ps.filter((p) => p.id !== post.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return null;
  // El que mira no ve la sección vacía.
  if (!isOwner && posts.length === 0) return null;

  const lleno = posts.length >= MAX_POSTS;

  return (
    <section aria-labelledby="ig-titulo" className="mt-8 pt-6 border-t border-border">
      <h2 id="ig-titulo" className="m-0 mb-1 font-condensed font-semibold text-[15px] text-white flex items-center gap-2">
        <Instagram size={15} /> Posts de Instagram
        {posts.length > 0 && <span className="font-sans font-normal text-[13px] text-secondary">{posts.length} de {MAX_POSTS}</span>}
      </h2>

      {isOwner && (
        <>
          <p className="m-0 mb-3 text-[13px] text-secondary">
            Pegá el link de un post público y se muestra acá, con todas sus fotos.
          </p>
          {!lleno && (
            <form onSubmit={agregar} className="flex gap-2 mb-2">
              <label htmlFor="ig-url" className="sr-only">Link del post de Instagram</label>
              <input
                id="ig-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); }}
                placeholder="https://www.instagram.com/p/…"
                className="flex-1 min-w-0 bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-[14px] outline-none font-sans focus:border-border-strong"
              />
              <Btn type="submit" size="sm" icon={isPremium ? Plus : Gem} loading={adding} disabled={!url.trim()}>
                Agregar
              </Btn>
            </form>
          )}
          {error && <p className="m-0 mb-3 text-[13px] text-danger">{error}</p>}
        </>
      )}

      {posts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 mt-3">
          {posts.map((p) => (
            <figure key={p.id} className="m-0 flex flex-col gap-2">
              <iframe
                src={p.embed_url}
                title={`Post de Instagram ${p.shortcode}`}
                loading="lazy"
                scrolling="no"
                className="w-full rounded-xl border border-border-mid bg-white"
                style={{ height: 560 }}
              />
              <figcaption className="flex items-center justify-between gap-2 text-[12px]">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-white">
                  Ver en Instagram
                </a>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setConfirmDel(p)}
                    className="inline-flex items-center gap-1 bg-transparent border-0 p-0 text-danger cursor-pointer"
                  >
                    <Trash2 size={13} /> Quitar
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {confirmDel && (
        <Modal
          title="¿Quitar el post?"
          message="Se saca de la galería del torneo. En Instagram no cambia nada."
          confirmText="Quitar"
          confirmDanger
          onConfirm={() => borrar(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
    </section>
  );
}
