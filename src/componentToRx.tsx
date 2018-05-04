import { ReactComponent, Rxfy, RxfyScalar, propsToRx } from "./";
import * as rx from "rxjs";
import * as React from "react";
import { isPromise, isObservable, mapObject, nullsafe, objRxToRxObj, enumObject, any, filterObject } from "keautils";
import { PropError, ErrorView } from "./error";

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
    T extends Promise<infer R> ? R :
    T;

/**Convierte un valor a observable */
function toObservable<T>(x: T | Promise<T> | rx.Observable<T>): rx.Observable<T> {
    if (isPromise(x)) {
        return rx.Observable.fromPromise(x);
    } else if (isObservable(x)) {
        return x;
    } else {
        return rx.Observable.from([x]);
    }
}



function renderComponentToRx<TProps>(
    props: rx.Observable<Rxfy<TProps>>,
    Component: ReactComponent<TProps>,
    Loading: ReactComponent<Partial<TProps>>,
    Error: ReactComponent<{ errores: PropError[] }>,
    options: ComponentToRxOptions<TProps> | undefined,
    loadingDelayMs: number 
): rx.Observable<JSX.Element | null> {

    function getIgnore(key: keyof TProps): {
        promise: boolean,
        observable: boolean
    } {
        const ignore = options && options[key] && options[key]!.ignore || {};
        return {
            promise: ignore.promise || false,
            observable: ignore.observable || false
        };
    }

    function getInitial<Key extends keyof TProps>(key: Key): TProps[Key] | undefined {
        return options && options[key] && options[key]!.initial;
    }

    function getLoadingProps(loading: boolean): {} {
        const filtrado = filterObject(options || {}, x => x && x.loading || false);
        const map = mapObject(filtrado, x => loading);
        return map as {};
    }

    function shouldIgnore<K extends keyof TProps>(x: RxfyScalar<TProps[K]>, key: K): boolean {
        const ignore = getIgnore(key);
        const prom = isPromise(x);
        const obs = isObservable(x);
        return (!obs && !prom) || (prom && ignore.promise) || (obs && ignore.observable);
    }

    function toObservableIgnore<K extends keyof TProps>(x: RxfyScalar<TProps[K]>, key: keyof TProps): {
        obs: rx.Observable<TProps[K]>,
        ignore: boolean,
        original: TProps[K]
    } {
        const ret = {
            ignore: shouldIgnore(x, key),
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
        const ret = obs
            .map(x => ({
                value: x,
                loading: false,
                error: undefined
            } as PropValue<T>))
            .startWith({
                value: getInitial(key),
                loading: true,
                error: undefined
            })
            .catch(err => [{
                value: undefined,
                loading: false,
                error: err
            } as PropValue<T>]);

        return ret;
    }

    interface ViewProps {
        loading: boolean;
        props: TProps;

    }

    type PropValues = {
        [K in keyof TProps]: PropValue<TProps[K]>
    };

    function obtenerError(values: PropValues): PropError[] {
        const arr = enumObject(values);
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

    const propsObs =
        props
            //Convertir todos los props a observable, asi ya no andamos manejando también promesas y valores
            //el objeto resultante indica si se debe de ignorar, ignorar significa pasar el valor tal cual al componente final
            .map(props => mapObject(props, (value, key) => toObservableIgnore(value, key)))
            //Convertir todos los props a un observable del prop que se le debe de pasar, considerando los ignores del mapeo anterior
            .map(props => mapObject(props, prop =>
                //Si es ignore, se crea un observable a partir de ese valor
                prop.ignore ? rx.Observable.from([prop.original]) : prop.obs
            ) as {
                    [K in keyof TProps]: rx.Observable<TProps[K]>
                })

            //Convertir cada prop a un PropValue
            .map(props => mapObject(props, (prop, key) => ObsToPropValue(prop, key)) as {
                [K in keyof TProps]: rx.Observable<PropValue<TProps[K]>>
            })

            //Convertir los props de observables a un observable de los props 
            .map(props => objRxToRxObj(props) as any as rx.Observable<PropValues>)
            .switch()

            //Tenemos que agarrar el ultimo valor del prop antes de que iniciara a cargar
            .scan((acc, value) => mapObject(value, (value, key) => {

                const ret = {
                    value: value.loading ? (acc[key] && acc[key].value) : (value.value as any),
                    error: value.error,
                    loading: value.loading
                };
                return ret;
            }), {

            } as PropValues)
        ;

    interface ViewPropsObs {
        props: TProps,
        errores: PropError[],
        cargando: boolean,
        first: boolean
    };
    const viewObs =
        propsObs
            //Determinar si el componente tiene error y si esta cargando y extraer los props
            .map(x => ({
                props: mapObject(x, y => y.value) as TProps,
                errores: obtenerError(x),
                cargando: estaCargando(x),
            }))
            .scan((acc, value) => ({
                ...value,
                first: (acc.first as any) == null
            }), {
                first: null,
            } as any)
            .map(x => x as ViewPropsObs)
            //Si se pone en cargando se espera cierto tiempo, esto hace que no se muestre el icono de cargando inmediatamente
            .debounce(x => (x.cargando && !x.first) ? rx.Observable.timer(loadingDelayMs) : Promise.resolve(0))
            //Asignar las propiedades que estan definidas como "loading"
            .map(x => ({
                ...x,
                props: {
                    ... (x.props as any),
                    ...getLoadingProps(x.cargando)
                } as TProps
            }))
        ;

    const view =
        viewObs
            .map(x => {
                if (x.errores.length > 0) {
                    return <Error errores={x.errores} />
                } else if (x.cargando) {
                    return <Loading {...x.props} />;
                } else {
                    return <Component {...x.props} />;
                }
            })
        ;
    return view;
}

/**Check if a value is a JSX.Element */
function isJsxElement(x: any): x is JSX.Element {
    return React.isValidElement(x);
}


/**
 * Devuelve un nuevo componente que acepta el valor singular, una promesa, o un observable en cualquiera de sus props, manejando correctamente el estado de cargando y de errores
 * @param Component Componente que se va a dibujar cuando todos los props han sido cargados y no exista ningún error de ningun observables/promesa
 * @param Loading Componente que se va a dibujar cuando existan props que aún estan cargando. Cargando implica que aún no se ha recibido ningún valor. Si es undefined se va a dibujar el componente, note que esto puede implicar que el componente reciva props como undefined cuando estas aún estén cargando
 * @param Error Componente que se va a dibujar cuando exista uno o mas props tales que su observable/promesa ha notificado de un error
 * @param options Opciones para los props
 */
export function componentToRx<TProps>(
    Component: ReactComponent<TProps>,
    Loading?: ReactComponent<Partial<TProps>> | JSX.Element,
    Error?: ReactComponent<{ errores: PropError[] }> | JSX.Element,
    options?: ComponentToRxOptions<TProps>,
    loadingTimeoutMs: number= 500
): React.ComponentClass<Rxfy<TProps>> {
    const LoadingEff = isJsxElement(Loading) ? (() => Loading) :
        (Loading || Component);
    const ErrorEff = isJsxElement(Error) ? (() => Error) :
        Error || ErrorView;

    const render = (props: rx.Observable<Rxfy<TProps>>) => {
        return renderComponentToRx(
            props,
            Component,
            LoadingEff,
            ErrorEff,
            options,
            loadingTimeoutMs
        );
    }

    return propsToRx(render);
}