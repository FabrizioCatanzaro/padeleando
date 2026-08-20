import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import SectionRule from '../shared/SectionRule';
import ClubTile from '../shared/ClubTile';
import PlayerAvatar from '../shared/PlayerAvatar';

// Quiénes juegan y quién organiza acá. Las dos listas salen de los mismos
// torneos que ya se muestran arriba: la categoría y el dueño venían en cada
// evento y hasta ahora se descartaban enteros.
export default function ClubCategories({ categorias, organizadores }) {
  const navigate = useNavigate();

  if (categorias.length === 0) {
    return (
      <div className="border border-dashed border-border-strong rounded-xl p-7 text-center">
        <div className="font-condensed font-bold text-[14.5px] text-white">Todavía no juega nadie acá</div>
        <p className="text-[12.5px] text-muted mt-1.5 mb-0 leading-relaxed max-w-[44ch] mx-auto">
          En cuanto una categoría organice una jornada en este club, aparece en esta lista.
        </p>
      </div>
    );
  }

  return (
    <>
      <SectionRule
        action={<span className="shrink-0 text-[11px] text-dim">Jugaron al menos una jornada acá</span>}
      >
        JUEGAN ACÁ
      </SectionRule>

      <div className="border border-border-mid rounded-xl overflow-hidden">
        {categorias.map((c) => (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/cat/${c.id}`)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/cat/${c.id}`); } }}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 bg-surface cursor-pointer hover:bg-surface-alt focus-visible:bg-surface-alt outline-none transition-colors"
          >
            <ClubTile emojis={c.emojis} name={c.name} size={38} />
            <div className="min-w-0 flex-1">
              <div className="font-condensed font-bold text-[14.5px] text-white truncate">{c.name}</div>
              <div className="text-[11.5px] text-muted mt-[3px] truncate">
                {c.owner_username && <>@{c.owner_username}<span className="opacity-40"> · </span></>}
                {c.jornadas} {c.jornadas === 1 ? 'jornada' : 'jornadas'} acá
              </div>
            </div>
            <ChevronRight size={14} className="shrink-0 text-dim" />
          </div>
        ))}
      </div>

      {organizadores.length > 0 && (
        <>
          <SectionRule>ORGANIZADORES</SectionRule>
          <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
            {organizadores.map((o) => (
              <div
                key={o.username}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/u/${o.username}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/u/${o.username}`); } }}
                className="flex items-center gap-3 border border-border-mid rounded-xl px-3.5 py-3 bg-surface cursor-pointer hover:bg-surface-alt focus-visible:bg-surface-alt outline-none transition-colors"
              >
                <PlayerAvatar name={o.name} src={o.avatar_url} size={30} />
                <div className="min-w-0">
                  <div className="font-condensed font-bold text-[13.5px] text-white truncate">@{o.username}</div>
                  <div className="text-[11.5px] text-muted mt-[3px] truncate">
                    {o.jornadas} {o.jornadas === 1 ? 'jornada' : 'jornadas'} acá
                    {o.categorias > 1 && <><span className="opacity-40"> · </span>{o.categorias} categorías</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
