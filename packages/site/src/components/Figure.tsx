export function Figure({
  src,
  alt,
  caption,
  light = false,
}: {
  src: string;
  alt: string;
  caption: string;
  light?: boolean;
}) {
  return (
    <figure className={light ? 'fig fig-light' : 'fig'}>
      <img src={src} alt={alt} loading="lazy" />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
