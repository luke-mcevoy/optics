/**
 * Units — one branded type per *dimension*, always stored in SI.
 *
 * Design decision (SESSION.md, binding): brand per dimension, not per unit.
 * `Length` is metres, `Power` is watts, `Angle` is radians. Unit-named
 * constructors (`nm`, `mm`, `mW`, `deg`) convert into SI at the boundary and
 * readers (`toNm`, `toMm`, `toDeg`) convert back out. Branding per unit
 * (a distinct `Mm` vs `Nm` type) would poison all internal arithmetic, so we
 * do not do it.
 *
 * The guarantee this buys: a `Power` cannot be passed where a `Length` is
 * expected, and vice versa — cross-dimension mixing is a compile-time error.
 * Within a dimension, use the arithmetic helpers below to keep the brand.
 */

declare const DIMENSION: unique symbol;

/** A physical quantity of dimension `D`, stored in its SI base unit. */
export type Quantity<D extends string> = number & { readonly [DIMENSION]: D };

/** Length, stored in metres. */
export type Length = Quantity<'Length'>;
/** Optical power (radiant flux), stored in watts. */
export type Power = Quantity<'Power'>;
/** Plane angle, stored in radians. */
export type Angle = Quantity<'Angle'>;

const brand = <D extends string>(x: number): Quantity<D> => x as Quantity<D>;

// --- Length constructors (-> metres) ------------------------------------
export const m = (x: number): Length => brand<'Length'>(x);
export const cm = (x: number): Length => brand<'Length'>(x * 1e-2);
export const mm = (x: number): Length => brand<'Length'>(x * 1e-3);
export const um = (x: number): Length => brand<'Length'>(x * 1e-6);
export const nm = (x: number): Length => brand<'Length'>(x * 1e-9);

// --- Length readers ------------------------------------------------------
export const toM = (x: Length): number => x as number;
export const toCm = (x: Length): number => (x as number) * 1e2;
export const toMm = (x: Length): number => (x as number) * 1e3;
export const toUm = (x: Length): number => (x as number) * 1e6;
export const toNm = (x: Length): number => (x as number) * 1e9;

// --- Power constructors (-> watts) --------------------------------------
export const W = (x: number): Power => brand<'Power'>(x);
export const mW = (x: number): Power => brand<'Power'>(x * 1e-3);
export const uW = (x: number): Power => brand<'Power'>(x * 1e-6);
export const nW = (x: number): Power => brand<'Power'>(x * 1e-9);

// --- Power readers -------------------------------------------------------
export const toW = (x: Power): number => x as number;
export const toMW = (x: Power): number => (x as number) * 1e3;
export const toUW = (x: Power): number => (x as number) * 1e6;
export const toNW = (x: Power): number => (x as number) * 1e9;

// --- Angle constructors (-> radians) ------------------------------------
export const rad = (x: number): Angle => brand<'Angle'>(x);
export const mrad = (x: number): Angle => brand<'Angle'>(x * 1e-3);
export const urad = (x: number): Angle => brand<'Angle'>(x * 1e-6);
export const deg = (x: number): Angle => brand<'Angle'>((x * Math.PI) / 180);

// --- Angle readers -------------------------------------------------------
export const toRad = (x: Angle): number => x as number;
export const toMrad = (x: Angle): number => (x as number) * 1e3;
export const toUrad = (x: Angle): number => (x as number) * 1e6;
export const toDeg = (x: Angle): number => ((x as number) * 180) / Math.PI;

// --- Brand-preserving arithmetic ----------------------------------------
// Same-dimension only: the type parameter forces both operands to agree.

export const add = <D extends string>(a: Quantity<D>, b: NoInfer<Quantity<D>>): Quantity<D> =>
  brand<D>((a as number) + (b as number));

export const sub = <D extends string>(a: Quantity<D>, b: NoInfer<Quantity<D>>): Quantity<D> =>
  brand<D>((a as number) - (b as number));

export const scale = <D extends string>(a: Quantity<D>, k: number): Quantity<D> =>
  brand<D>((a as number) * k);

export const neg = <D extends string>(a: Quantity<D>): Quantity<D> => brand<D>(-(a as number));

export const abs = <D extends string>(a: Quantity<D>): Quantity<D> => brand<D>(Math.abs(a as number));

/** Dimensionless ratio of two quantities of the same dimension. */
export const ratio = <D extends string>(a: Quantity<D>, b: NoInfer<Quantity<D>>): number =>
  (a as number) / (b as number);

/** Sum of quantities of one dimension; `zero` fixes the dimension when empty. */
export const sum = <D extends string>(xs: readonly Quantity<D>[], zero: Quantity<D>): Quantity<D> =>
  xs.reduce<Quantity<D>>((acc, x) => add(acc, x), zero);

/** A length of zero metres — handy identity element. */
export const ZERO_LENGTH: Length = m(0);
/** An angle of zero radians. */
export const ZERO_ANGLE: Angle = rad(0);
