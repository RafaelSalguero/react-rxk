import * as React from "react";
import * as rx from "rxjs";
import { isObservable } from "keautils";

export type Element = JSX.Element | null | false;
export interface RxToReactProps {
    value?: rx.Observable<React.ReactNode> | React.ReactNode;
}
export interface RxToReactState {
    value: React.ReactNode;
    observable: rx.Observable<React.ReactNode> | undefined;
    oldValue: rx.Observable<React.ReactNode> | React.ReactNode;
    subscription: rx.Subscription | undefined;
    onNext: (x: Element) => void;
    setted: boolean;
}

/**
 * Componente que toma como entrada un observable de elementos JSX y los dibuja
 */
export class RxToReact extends React.PureComponent<RxToReactProps, RxToReactState> {
    constructor(props) {
        super(props);
        this.state = {
            value: null,
            observable: undefined,
            oldValue: undefined,
            subscription: undefined,
            onNext: this.onNext,
            setted: false
        };
    }

    firstRender: boolean = false;
    onNext = (x: Element) => {
        if (this.firstRender) {
            this.setState({
                value: x,
                setted: true
            });
        } else {
            this.state = { ... this.state, value: x };
        }
    }

    static getDerivedStateFromProps(nextProps: RxToReactProps, prevState: RxToReactState): RxToReactState {
        if (nextProps.value != prevState.oldValue) {
            //Quitar la subscripción anterior
            if (prevState.subscription != null) {
                prevState.subscription.unsubscribe();
            }

            const nextPropsVal = nextProps.value;
            if (nextPropsVal != null && isObservable(nextPropsVal)) {
                let siguienteValor: Element | undefined = undefined;
                //Esta variable determina si el onNext se llamo después del subscribe, si es true, significa que el onNext se llamo en el mismo instante que la llamada del subscribe
                let siguienteValorInstantaneo = true;
                const onNext = (next: Element) => {
                    siguienteValor = next;

                    //Si el onNext fue instantaneo, no llamamos al onNext ya que será suficiente con devolver el nuevo state
                    if(!siguienteValorInstantaneo) {
                        prevState.onNext(next);
                    }
                }
                const newSubscription = nextPropsVal.subscribe(onNext);
                siguienteValorInstantaneo = false;
                return {
                    ...prevState,
                    oldValue: nextPropsVal,
                    value: (siguienteValor != undefined) ? siguienteValor : prevState.value,
                    subscription: newSubscription,
                    observable: nextPropsVal,
                };
                return null as any;
            } else {
                return {
                    ...prevState,
                    value: nextPropsVal,
                    oldValue: nextPropsVal,
                    observable: undefined,
                    subscription: undefined
                };
            }
        } else {
            return prevState;
        }
    }

    componentWillUnmount() {
        if(this.state.subscription)
            this.state.subscription.unsubscribe();
    }

    render() {
        this.firstRender = true;
      
        const val = this.props.value;
        //Si el valor que nos pasan es un ReactElement, lo dibujamos directamente:
        if(isObservable(val)){
            return this.state.value || null;
        } else {
            return val || null;
        }
    }
}