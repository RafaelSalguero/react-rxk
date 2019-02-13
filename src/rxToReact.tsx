import * as React from "react";
import * as rx from "rxjs";

const x = rx.Observable.from([]);
x.subscribe(next => console.log(next));
export type Element = JSX.Element | null | false;
export interface RxToReactProps {
    value?: rx.Observable<Element>;
}
export interface RxToReactState {
    value: Element;
    observable: rx.Observable<Element> | undefined;
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
            subscription: undefined,
            onNext: this.onNext,
            setted: false
        };
    }

    firstRender: boolean = false;
    onNext = (x: Element) => {
        if (this.firstRender) {
            console.log("SetState");
            this.setState({
                value: x,
                setted: true
            });
        } else {
            this.state = { ... this.state, value: x };
        }
    }

    static getDerivedStateFromProps(nextProps: RxToReactProps, prevState: RxToReactState): RxToReactState {
        if (nextProps.value != prevState.observable) {
            //Quitar la subscripción anterior
            if (prevState.subscription != null) {
                prevState.subscription.unsubscribe();
            }
            if (nextProps.value != null) {
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
                const newSubscription = nextProps.value.subscribe(onNext);
                siguienteValorInstantaneo = false;
                return {
                    ...prevState,
                    value: (siguienteValor != undefined) ? siguienteValor : prevState.value,
                    subscription: newSubscription,
                    observable: nextProps.value,
                };
            } else {
                return {
                    ...prevState,
                    value: null,
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
        if(this.state.setted) {
			console.log((this.state as any).value.type.name);
			console.log((this.state as any).value.props);
        }
        
        return this.state.value;
    }
}