import { ReactComponent, Rxfy, RxfyScalar } from "./utils";
import * as rx from "rxjs";
import * as React from "react";
import { isPromiseLike, isObservable, mapObject, nullsafe, objRxToRxObj, enumObject, any, filterObject, shallowDiff, intersect, intersectKeys, contains, setEquals, all, debounceSync, syncResolve, delay, LoadingSym } from "keautils";
import { PropError, ErrorView } from "./error";
import * as rxOp from "rxjs/operators";
import { TopProperty } from "csstype";
import { createJSX } from "./utils";

export interface ComponentToRxPropOptions<T> {
    /**Ignored observables or promises are passed as-is to the inner component */
    ignore?: {
        /**
         * True to pass through observable values to the component
         */
        observable?: boolean,
        /**
         * True to pass through promise values to the component
         */
        promise?: boolean
    },
    loading?: boolean,
    initial?: T
};

export type ComponentToRxOptions<TProps> = { [K in keyof TProps]?: ComponentToRxPropOptions<TProps[K]> } | undefined;

type UndoToObs<T> =
    T extends rx.Observable<infer R> ? R :
    T extends PromiseLike<infer R> ? R :
    T;

/**Convierte un valor a observable */
function toObservable<T>(x: T | PromiseLike<T> | rx.Observable<T>): rx.Observable<T> {
    if (isPromiseLike(x)) {
        return rx.from(x);
    } else if (isObservable(x)) {
        return x;
    } else {
        return rx.from([x]);
    }
}



function getIgnore<TProps>(key: keyof TProps, options: ComponentToRxOptions<TProps> | undefined): {
    promise: boolean,
    observable: boolean
} {
    const ignore = options && options[key] && options[key]!.ignore || {};
    return {
        promise: ignore.promise || false,
        observable: ignore.observable || false
    };
}

/**Indica si un prop se debe de ignorar según el valor del prop (que no sea promesa ni observable) o según la configuración (si el usuario indicó ignorar ese prop) */
function shouldIgnore<TProps, K extends keyof TProps>(x: RxfyScalar<TProps[K]>, key: K, options: ComponentToRxOptions<TProps> | undefined): boolean {
    const ignore = getIgnore<TProps>(key, options);
    const prom = isPromiseLike(x);
    const obs = isObservable(x);
    return (!obs && !prom) || (prom && ignore.promise) || (obs && ignore.observable);
}

/**Devuelve true si todas las propiedades pasan como "ignore", es decir, que se deben de pasar tal cual al componente dibujado */
export function allPropsIgnore<TProps>(props: Rxfy<TProps>, options: ComponentToRxOptions<TProps> | undefined): boolean {
    const allProps = enumObject(props);
    return all(allProps, x => shouldIgnore(x.value, x.key, options));
}

export function renderComponentToRx<TProps extends { [k: string]: any }>(
    props: rx.Observable<Rxfy<TProps>>,
    Component: ReactComponent<TProps>,
    Loading: ReactComponent<Partial<TProps>>,
    Error: ReactComponent<{ errores: PropError<any>[] }>,
    options: ComponentToRxOptions<TProps> | undefined,
    loadingDelayMs: number
): rx.Observable<React.ReactNode> {
    type KeyofProps = Extract<keyof TProps, string>;

    function getInitial<Key extends keyof TProps>(key: Key): TProps[Key] | undefined {
        return options && options[key] && options[key]!.initial;
    }

    function getLoadingProps(loading: boolean): {} {
        const filtrado = filterObject(options || {}, (x: ComponentToRxPropOptions<any>) => x && x.loading || false);
        const map = mapObject(filtrado, x => loading);
        return map as {};
    }

    function toObservableIgnore<K extends keyof TProps>(x: RxfyScalar<TProps[K]>, key: keyof TProps): {
        obs: rx.Observable<TProps[K]>,
        ignore: boolean,
        original: TProps[K]
    } {
        const ret = {
            ignore: shouldIgnore<TProps, typeof key>(x, key, options),
            obs: toObservable(x),
            original: x
        };

        return ret as any;
    }

    interface PropValue<T> {
        value: T | undefined;
        loading: boolean;
        error: any;
    }

    function ObsToPropValue<TKey extends keyof TProps>(obs: rx.Observable<TProps[TKey]>, key: TKey): rx.Observable<PropValue<TProps[TKey]>> {
        type T = TProps[TKey];
        const loading = {
            value: getInitial(key),
            loading: true,
            error: undefined
        };

        const ret = obs.pipe(
            rxOp.map(x => x == LoadingSym ? loading : ({
                value: x,
                loading: false,
                error: undefined
            } as PropValue<T>)),
            rxOp.startWith(loading),
            rxOp.catchError(err => [{
                value: undefined,
                loading: false,
                error: err
            } as PropValue<T>])

        );

        return ret;
    }

    interface ViewProps {
        loading: boolean;
        props: TProps;

    }

    type PropValues = {
        [K in keyof TProps]: PropValue<TProps[K]>
    };

    function obtenerError(values: PropValues): PropError<any>[] {
        const arr = enumObject(values) as {
            key: KeyofProps,
            value: PropValue<TProps[keyof TProps]>
        }[];


        const errores = arr.filter(x => x.value.error != null);
        return errores.map(x => ({
            error: x.value.error,
            prop: x.key
        }));
    }

    function estaCargando(values: PropValues): boolean {
        const arr = enumObject(values);
        const ret = any(arr, x => x.value.loading);
        return ret;
    }

    type PropsRx = { [K in keyof TProps]: rx.Observable<TProps[K]> };
    type PropValuesRx = {
        [K in keyof TProps]: rx.Observable<PropValue<TProps[K]>>
    };

    function toPopValuesObs(obs:
        rx.Observable<PropsRx>
    ): rx.Observable<PropValuesRx> {
        type Seed = {
            last: PropsRx,
            curr: PropsRx,
            diff: { [K in keyof TProps]?: true },
            propValues: PropValuesRx
        }

        const r = obs.pipe(
            rxOp.scan((acc: Seed, value: PropsRx) => {
                const last = acc.curr;
                const diff = shallowDiff(value, last);
                //Sólo recalculamos el ObsToPropValue de los observables que SI cambiaron
                const propValues =
                    mapObject(value, (val, key) => {
                        if (diff[key]) {
                            //Recalcular:
                            return ObsToPropValue(val, key);
                        } else {
                            //Devolver el anterior:
                            return acc.propValues[key];
                        }
                    });

                const seed = ({
                    last: acc.curr,
                    curr: value,
                    diff: shallowDiff(value, acc.curr),
                    propValues: propValues
                } as Seed);

                return seed;
            }, {
                last: {},
                curr: {},
                diff: {}
            } as Seed),
            rxOp.map(x => x.propValues)
        );

        return r;
    }

    function propValuesMapSwich(obs: rx.Observable<PropValuesRx>): rx.Observable<PropValues> {
        const ret = new rx.Observable<PropValues>(observer => {
            let last: PropValuesRx = {} as any;
            let lastCombine: PropValues = {} as any;
            let subscriptions: { [K in keyof TProps]: rx.Subscription } = {} as any;

            const ret = obs.subscribe((current: PropValuesRx) => {
                const diff = shallowDiff(current, last);
                const diffKeys = enumObject(diff).map(x => x.key);
                //Propiedades de las cuales se hay de desubscribir
                const currentKeys = Object.keys(current) as (keyof TProps)[];
                const unsubscribeKeys = intersect(Object.keys(last), diffKeys) as (keyof TProps)[];
                const subscribeKeys = intersect(currentKeys, diffKeys) as (keyof TProps)[];
                last = current;

                function onInnerValue<K extends keyof TProps>(key: K, value: PropValue<TProps[K]>) {
                    const newCombine = {
                        ... (lastCombine as any),
                        [key]: value
                    };

                    //Quitamos del combine los props que no se encuentran en el current:
                    const filtered = filterObject(newCombine, (value, key) => contains(currentKeys, key));
                    lastCombine = filtered;

                    //Checamos si el ultimo combine esta completo, en ese caso, emitimos el valor
                    const combineKeys = Object.keys(lastCombine);
                    const combineComplete = setEquals(currentKeys, combineKeys);
                    if (combineComplete) {
                        observer.next(lastCombine);
                    }
                }

                //Quitamos las subscripciones anteriores
                for (const k of unsubscribeKeys) {
                    subscriptions[k].unsubscribe();
                    delete subscriptions[k];
                }

                //Nos subscribimos a los nuevos props:
                for (const k of subscribeKeys) {
                    const newSub = current[k].subscribe(x => onInnerValue(k, x));
                    subscriptions[k] = newSub;
                }
            });


            return () => {
                //Quitar todas las subscripciones hijas:
                for (const k in subscriptions) {
                    subscriptions[k].unsubscribe();
                };

                ret.unsubscribe();
            };
        });

        return ret;
    }

    const propsAntesSwitch =
        props.pipe(
            //Convertir todos los props a observable, asi ya no andamos manejando también promesas y valores sincronos.
            //El objeto resultante indica si se debe de ignorar, ignorar significa pasar el valor tal cual al componente final
            rxOp.map(props => mapObject(props, (value, key) => toObservableIgnore(value, key))),
            //Convertir todos los props a un observable del prop que se le debe de pasar, considerando los ignores del mapeo anterior
            rxOp.map(props => mapObject(props, prop =>
                //Si es ignore, se crea un observable a partir de ese valor
                prop.ignore ? rx.from([prop.original]) : prop.obs
            ) as {
                    [K in keyof TProps]: rx.Observable<TProps[K]>
                })
        )
        //En este punto tenemos un observable de objetos, donde cada propiedad del objeto es un observable del valor del prop
        ;

    const propsValues = toPopValuesObs(propsAntesSwitch);
    const propMapSwich = propValuesMapSwich(propsValues);

    const propsObs =
        //En este punto tenemos un observable de objetos, donde cada propiedad es un 
        //observable de PropValue, y el prop value envuelve al valor del prop, ademas de a su valor inicial, si esta cargando/con error o no

        //Convertir los props de observables a un observable de los props 
        propMapSwich.pipe(
            //Tenemos que agarrar el ultimo valor del prop antes de iniciar a cargar
            rxOp.scan((acc, value) => mapObject(value, (value, key) => {

                const ret = {
                    value: value.loading ? (acc[key] && acc[key].value) : (value.value as any),
                    error: value.error,
                    loading: value.loading
                };
                return ret;
            }), {

            } as PropValues)
        );

    interface ViewPropsObs {
        props: TProps,
        errores: PropError<any>[],
        cargando: boolean,
        first: boolean
    };

    //Observable con los JSX sin el debounce:
    const viewObsSinDeb =
        propsObs.pipe(
            //Determinar si el componente tiene error y si esta cargando y extraer los props
            rxOp.map(x => ({
                props: mapObject(x, y => y.value) as TProps,
                errores: obtenerError(x),
                cargando: estaCargando(x),
            })),
            rxOp.scan((acc, value) => ({
                ...value,
                first: (acc.first as any) == null
            }), {
                first: null,
            } as any),
            rxOp.map(x => x as ViewPropsObs)
        );


    const viewObs =
        viewObsSinDeb.pipe(
            debounceSync(x => {
                return (x.cargando && loadingDelayMs > 0) ? delay(loadingDelayMs) : syncResolve();
            }),
            rxOp.map(x => ({
                ...x,
                props: {
                    ... (x.props as any),
                    ...getLoadingProps(x.cargando)
                } as TProps
            }))
        );

    const view =
        viewObs.pipe(
            rxOp.map(x => {
                if (x.errores.length > 0) {
                    return createJSX(Error, { errores: x.errores });
                }
                if (x.cargando) {
                    return createJSX(Loading, x.props);
                }

                return createJSX(Component, x.props);

            })
        );
    return view;
}

/**Check if a value is a JSX.Element */
export function isJsxElement(x: any): x is JSX.Element {
    return React.isValidElement(x);
}

