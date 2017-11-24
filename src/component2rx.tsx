import { rxToReact } from "./rxToReact";
import * as rx from "rxjs";
import * as React from "react";
import { shallowDiff, mapObject } from "keautils";

export type Rxfy<T> = {
    [K in keyof T]: T[K] | rx.Observable<T[K]> | PromiseLike<T[K]>
}

export type ReactComponent<TProps> = React.ComponentClass<TProps> | ((props: TProps) => (JSX.Element | null));

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

/**Check if a value is a JSX.Element */
function isJsxElement(x: any): x is JSX.Element {
    return React.isValidElement(x);
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
 * @param component The component to render when all observables have reported at least one value
 * @param fallback The element to render when there are still pending observables to report the first value. If undefined the component is rendered with undefined values
 */
export function componentToRx<TProps>(
    component: ReactComponent<TProps>,
    Fallback?: ReactComponent<any> | JSX.Element,
    Error?: ReactComponent<{ error: any }>,
    options?: ComponentToRxOptions<TProps>): React.ComponentClass<Rxfy<TProps>> {

    const MyComp = component;
    interface State {
        values: Partial<TProps>;
        firstValue: {[K in keyof TProps]?: true};
        error: any;
    }
    return class ComponentToRx extends React.Component<Rxfy<TProps>, State> {
        constructor(props) {
            super(props);
            this.state = {
                error: undefined,
                values: mapObject(options || {}, x => x && x.initial),
                firstValue: {}
            };
        }

        private subscriptions: {[K in keyof TProps]?: rx.Subscription | undefined } = {};

        /**Devuelve true si el componente esta listo para mostrar, esto es si ya fue recibido el primer valor de todas las subscripciones */
        private get ready() {
            for (const key in this.subscriptions) {
                if (!this.state.firstValue[key])
                    return false;
            }
            return true;
        }

        /**Maneja un siguiente valor del observable */
        private handleNext = <K extends keyof TProps>(key: K, value: any) => {
            this.setState((prev) => ({
                values: { ...(prev.values as {}), [key]: value },
                firstValue: { ...(prev.firstValue as {}), [key]: true },
            }));
        }

        /**Maneja un error del observable */
        private handleError = (error: any) => {
            this.setState((prev) => ({ error: error }));
        }

        /**Maneja un on complete del observable */
        private handleComplete = () => {

        }

        componentWillMount() {
            this.processProps({} as any, this.props);
        }

        componentWillUnmount() {
            //Quitar todas las subscripciones
            for (const key in this.subscriptions) {
                const value = this.subscriptions[key];
                if (value) {
                    value.unsubscribe();
                }
            }
        }

        private processProps(old: Rxfy<TProps>, next: Rxfy<TProps>) {
            const diff = shallowDiff(old, next);
            for (const prop in diff) {
                const oldValue = old[prop];
                const nextValue = next[prop];
                //Remove old subscription
                const oldSubscription = this.subscriptions[prop];
                if (oldSubscription) {
                    oldSubscription.unsubscribe();
                    this.subscriptions[prop] = undefined;
                }

                //Create the new subscription
                const obs = toComponentRxObservable(prop, nextValue, options);
                if (obs.observe) {
                    this.subscriptions[prop] = obs.observable.subscribe(next => this.handleNext(prop, next), this.handleError, this.handleComplete);
                }
            }
        }

        componentWillReceiveProps(next: Rxfy<TProps>) {
            this.processProps(this.props, next);
        }

        render() {
            //Fallback to this.values if current state value is undefined
            if (this.state.error) {
                if (Error) {
                    const c = <Error error={this.state.error} />;
                    return null as any;
                }
                else {
                    const c = <span style={{ color: "red" }} ><b>Error:  {this.state.error}</b></span>;
                    return c;
                }
            }

            const rxValues = this.state.values;
            const externalProps = this.props as Rxfy<TProps>;
            const props = mapObject(externalProps, (x, key) => toComponentRxObservable(key, x, options).observe ? rxValues[key] : (x as any));

            //Render the inner or the fallback component
            const ComponentToRender = (this.ready || !Fallback) ? MyComp :
                isJsxElement(Fallback) ? (() => Fallback) :
                    Fallback;

            return <ComponentToRender {...props} />;
        }
    }
}