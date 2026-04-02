import { useObraImageUrl } from './useObraImageUrl';

interface ObraArtProps {
  obraId: number;
  obraNombre: string;
  obraCliente?: string;
  chipLabel: string;
  themeClassName: string;
  overlayClassName?: string;
  caption?: string;
}

export function ObraArt({
  obraId,
  obraNombre,
  obraCliente,
  chipLabel,
  themeClassName,
  overlayClassName = '',
  caption,
}: ObraArtProps) {
  const obraImage = useObraImageUrl(obraId);

  return (
    <div className={`${themeClassName}${obraImage.imageUrl ? ' work-card-art-image' : ''}`.trim()}>
      {obraImage.imageUrl ? <img src={obraImage.imageUrl} alt={obraNombre} className="obra-image obra-image-hero" /> : null}
      {!obraImage.imageUrl && obraImage.isLoading ? <div className="obra-image-placeholder obra-image-skeleton" /> : null}
      <div className={`work-card-overlay ${overlayClassName}`.trim()}>
        <span className="work-card-chip">{chipLabel}</span>
        <h2 className="work-card-title">{obraNombre}</h2>
        {obraCliente ? <p className="work-card-copy">{obraCliente}</p> : null}
        {caption ? <div className="pending-hero-caption">{caption}</div> : null}
      </div>
    </div>
  );
}
