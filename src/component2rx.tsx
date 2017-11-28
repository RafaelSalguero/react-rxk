import { rxToReact } from "./rxToReact";
import * as rx from "rxjs";
import * as React from "react";
import { shallowDiff, mapObject, filterObject, enumObject } from "keautils";
import { Rxfy, State, ReactComponent, StateValue, StateValues } from "./types";
import { ViewProps, Component2RxView } from "./view";


/**Check if a value is an observable */
function isObservable<T>(x: T | rx.Observable<T> | PromiseLike<T>): x is rx.Observable<T> {
    if (x == null) return false;
    const y = x as rx.Observable<T>;
    const sym = y[rx.Symbol.observable];
    if (typeof sym == "function") {
        return (sym as Function).call(y) === y;
    } else {
        return false;
    }
}

/**Check if a value is a native ES6 promise */
function isPromise<T>(x: T | PromiseLike<T> | rx.Observable<T>): x is Promise<T> {
    return x != null && (typeof (x as any).then === 'function');
}



export interface ComponentToRxPropOptions<T> {
    /**Ignored observables or promises are passes as-is to the inner component */
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
    /**Initial value for the property */
    initial?: any;
    /**If true this property value will be true when the observables are pending for the first value and false when the loading is done */
    loading?: boolean;
};

export type ComponentToRxOptions<TProps> = {[K in keyof TProps]?: ComponentToRxPropOptions<TProps[K]> } | undefined;

/**Convert a value to an observable if the property is configured to be observed */
function toComponentRxObservable<TProps, K extends keyof TProps>(key: K, value: TProps[K] | rx.Observable<TProps[K]> | PromiseLike<TProps[K]>, options: ComponentToRxOptions<TProps>): { observe: false } | { observe: true, observable: rx.Observable<any> } {
    var prop = (options || {})[key] || {};
    const ignore = prop.ignore || {};

    if (isObservable(value) && !ignore.observable) {
        return { observe: true, observable: value };
    }
    else if (isPromise(value) && !ignore.promise) {
        const obs = rx.Observable.fromPromise(value);
        return { observe: true, observable: obs };
    } else {
        return { observe: false };
    }
}

/**
 * Convert a react component to a one that accepts rxjs observable on all its props
 * @param Component The component to render when all observables have reported at least one value
 * @param fallback The element to render when there are still pending observables to report the first value. If undefined the component is rendered with undefined values
 */
export function componentToRx<TProps>(
    Component: ReactComponent<TProps>,
    Fallback?: ReactComponent<any> | JSX.Element,
    Error?: ReactComponent<{ error: any }>,
    options?: ComponentToRxOptions<TProps>,
    loadingTimeout = 100
): React.ComponentClass<Rxfy<TProps>> {

    const MyComp = Component;


    interface Subscription {
        /**The original subscription */
        subscription: rx.Subscription;
        /**True if the first value for the subscription has arrived */
        firstValue: boolean;
    }

    type Subscriptions = {[K in keyof TProps]?: Subscription};

    /**Return true if all subscriptions have its firstValue == true */
    function isReady(x: StateValues<TProps>): boolean {
        for (const key in x) {
            if (!x[key]!.firstValue)
                return false;
        }
        return true;
    }

    interface PendingSubscription {
        prop: keyof TProps;
        observable: rx.Observable<any>
    }


    /**Función pura que obtiene las subscripciones pendientes dado un cambio en el props. Esta función es pura */
    function processProps(oldProps: Partial<Rxfy<TProps>>, nextProps: Rxfy<TProps>, oldSubscriptions: Subscriptions): PendingSubscription[] {
        const diff = shallowDiff(oldProps, nextProps);
        let ret: PendingSubscription[] = [];
        for (const prop in diff) {
            const nextValue = nextProps[prop];

            //Create the new subscription
            const obs = toComponentRxObservable(prop, nextValue, options);
            if (obs.observe) {
                ret.push({ prop: prop, observable: obs.observable });

            }
        }
        return ret;
    }

    /**Une los valores del state con las subscripciones pendientes, esta función es pura */
    function mergeStateValuesWithPendingSubscriptions(values: StateValues<TProps>, pendingSubs: PendingSubscription[], version: number) {
        let ret: StateValues<TProps> = { ... (values as any) };
        for (const sub of pendingSubs) {
            const prop = sub.prop;
            const propOptions = options && options[prop];
            const initial = propOptions && propOptions.initial;
            let current = ret[prop] || { value: initial, firstValue: false, version: 0 };
            if(version > current.version) {
                current.firstValue = false;
            }
            ret[prop] = current;
        }
        return ret;
    }

    /**Esta función no es pura y aplica las subscripciones pendiente, desuscribiendose de las anteriores, devuelve un nuevo objeto de subscripciones */
    function applyPendingSubscriptions(oldSubscriptions: Subscriptions, pending: PendingSubscription[], subscribe: (observable: rx.Observable<any>, prop: keyof TProps) => rx.Subscription) {
        let nextSubscriptions = { ...(oldSubscriptions as any) };
        for (const sub of pending) {
            const prop = sub.prop;
            //Remove old subscription
            const oldSubscription = oldSubscriptions[prop];
            if (oldSubscription) {
                oldSubscription.subscription.unsubscribe();
                nextSubscriptions[prop] = undefined;
            }

            nextSubscriptions[prop] = {
                subscription: subscribe(sub.observable, prop),
                firstValue: false
            };
        }
        return nextSubscriptions;
    }

    /**Obtiene los props que se le van a pasar al componente interno */
    function getInnerComponentProps(externalProps: Rxfy<TProps>, stateValues: StateValues<TProps>) {
        const stateReady = isReady(stateValues);
        const stateMappedValues = mapObject(stateValues, x => x!.value);

        const values = mapObject(externalProps, (x, key) => toComponentRxObservable(key, x, options).observe ? stateMappedValues[key] : (x as any));

        const loading = !stateReady;
        const loadingProps = mapObject(filterObject((options || {}), x => !!(x && x.loading)), x => loading);
        const props = { ...(loadingProps as {}), ...(values as {}) };

        return props;
    }

    /**Obtiene los props que se le van a pasar al view */
    function getViewProps(externalProps: any, state: State<TProps>): ViewProps {
        const loadingTime = state.stateDate.valueOf() - state.loadingDate.valueOf();
        const ready = isReady(state.values);
        return {
            error: state.error,
            props: getInnerComponentProps(externalProps, state.values),
            ready: isReady(state.values),
            loadingTimeout: loadingTime > loadingTimeout,
            Error: Error,
            Fallback: Fallback,
            MyComp: Component
        };
    }

    /**Get the initial value for the ready property of the state */
    function initialReady(props: Rxfy<TProps>): boolean {
        return enumObject(mapObject(props, (value, key) => toComponentRxObservable(key, value, options).observe)).filter(x => x.value).length > 0;
    }


    /**Obtiene los valores initiales del state */
    function getInitialValues(props: Rxfy<TProps>) {
        return mergeStateValuesWithPendingSubscriptions({}, processProps({}, props, {}), 1);
    }

    return class ComponentToRx extends React.Component<Rxfy<TProps>, State<TProps>> {
        constructor(props) {
            super(props);
            const now = new Date();
            this.state = {
                error: undefined,
                values: getInitialValues(props),
                loadingDate: now,
                stateDate: now
            };
        }

        private subscriptions: Subscriptions = {};
        private _isMounted: boolean = false;
        /**Maneja un siguiente valor del observable */
        private handleNext = <K extends keyof TProps>(key: K, value: any, version: number) => {
            const sub = this.subscriptions;
            const nextSub = { ... (sub as any), [key]: { ...sub[key], firstValue: true } };
            this.subscriptions = nextSub;
            const now = new Date();
            this.setState((prev) => ({
                values: mapObject(prev.values,
                    //NOTA: El control de versiones en el onNext verifica si la version es mayor o igual, no si es mayor a diferencia de la puesta del loading, esto porque el mismo observable
                    //con varios valores va a generar valores para la misma versión
                    (prevStateValue, stateKey) => version >= prevStateValue!.version && (stateKey as any) == key ?
                        ({value: value, firstValue: true, version: version } as StateValue) : 
                        prevStateValue
                ),
                stateDate: now
            }));
        }

        /**Maneja un error del observable */
        private handleError = (error: any) => {
            const now = new Date();
            this.setState((prev) => ({ error: error, stateDate: now }));
        }

        /**Maneja un on complete del observable */
        private handleComplete = () => {
            //no-op
        }

        componentDidMount() {
            this._isMounted = true;
        }

        componentWillMount() {
            this.handleProps({} as any, this.props);
        }

        componentWillUnmount() {
            this._isMounted = false;
            //Quitar todas las subscripciones
            for (const key in this.subscriptions) {
                const value = this.subscriptions[key];
                if (value) {
                    value.subscription.unsubscribe();
                }
            }
        }

        private currentPropsVersion: number;
        private propsVersion: number = 1;
        private handleProps(old: Rxfy<TProps>, next: Rxfy<TProps>) {
            this.propsVersion+= 2;
            const loadingStateVersion = this.propsVersion;
            const onNextVersion = loadingStateVersion + 1;
            //Obtener las subscripciones pendientes
            const pendingSubs = processProps(old, next, this.subscriptions);
            const newSubscriptions = pendingSubs.length > 0;

            //Nos subscribimos 
            const nextSub = applyPendingSubscriptions(this.subscriptions, pendingSubs, (obs, prop) => obs.subscribe(next => this.handleNext(prop, next, onNextVersion), this.handleError, this.handleComplete));
            this.subscriptions = nextSub;

            //Actualizar el state a uno que esta cargando, note que visualmente este cambio no se va a reflejar gracias al cache del View:
            const now = new Date();
            this.setState(oldState => ({
                stateDate: now,
                loadingDate: newSubscriptions ? now : oldState.loadingDate,  //Solamente establecemos la fecha de carga si hubo nuevas subscripciones
                values: mergeStateValuesWithPendingSubscriptions(oldState.values, pendingSubs, loadingStateVersion)
            }));



            if (newSubscriptions) {
                //Despues de un pequeño tiempo despues del loadingTimeout forzamos un refrescado con un nuevo state, esto para que el view considere dejar de mostrar el cache y comenzar a mostrar el spinner en
                //caso de que aún este cargando
                setTimeout(() => {
                    const now = new Date();
                    if (this._isMounted) {
                        //Refrescamos el componente en caso de que ya se ha vencido el loadingTimeout
                        this.setState({ stateDate: now });
                    }

                }, loadingTimeout + 20);
            }
        }

        componentWillReceiveProps(next: Rxfy<TProps>) {
            this.handleProps(this.props, next);
        }

        render() {
            const props = getViewProps(this.props, this.state);
            return <Component2RxView {...props
            } />
        }
    }
}