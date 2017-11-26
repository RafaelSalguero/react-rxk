import { rxToReact, componentToRx } from "../src/index";
import * as React from "react";
import * as DOM from "react-dom";
import * as rx from "rxjs";

function delay(ms: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}

interface MyProps {
    a: number;
    b: number;
    c: number;
}
class MyComp extends React.Component<MyProps> {
    render() {
        return (
            <div>
                <label>a:</label>{this.props.a}
                <br />
                <label>b:</label>{this.props.b}
                <br />
                <label>c:</label>{this.props.c}
                <br />
            </div>)
    }
}

interface MyProps2 {
    a?: string;
    b?: string;
    c?: Promise<string>;
    d?: rx.Observable<string>;
    e?: string;
}
class MyComp2 extends React.Component<MyProps2> {
    render() {
        return (
            <div>
                <div>
                    <hr />
                    <label>a:</label>{this.props.a}
                    <br />
                    <label>b:</label>{this.props.b}
                    <br />
                    <label>c es promesa:</label>{"" + !!(this.props.c && typeof this.props.c.then == "function")}
                    <br />
                    <label>valor de c:</label>{this.props.c && rxToReact(this.props.c.then(x => <span>{x}</span>))}
                    <br />
                    <label>d es observable:</label> {"" + !!(this.props.d && typeof this.props.d.subscribe == "function")}
                    <br />
                    <label>a:</label>{this.props.a}
                    <br />
                    <label>valor de d:</label>{this.props.d && rxToReact(this.props.d.map(x => <span>{x}</span>))}
                    <br />
                    <label>e:</label> {this.props.e}
                    <br />
                    <hr />
                </div>
            </div>
        )
    }
}

class OtraPrueba extends React.Component<{ d: rx.Observable<string>, e: string }> {
    render() {
        return (
            <div>
                {rxToReact(this.props.d.map(x => <span>{x}</span>))}
                <br />
                {this.props.e}
            </div>
        );
    }
}

class Texto extends React.Component<{ texto: string }> {
    render() {
        return (
            <div>
                <span>El texto es: {this.props.texto}</span>
                <br />
            </div>
        );
    }
}

const OtraPruebaRx = componentToRx(OtraPrueba, undefined, undefined, { d: { ignore: { observable: true } } });
const MyCompRx = componentToRx(MyComp);
const MyComp2Rx = componentToRx(MyComp2, <span>Cargando...</span>, undefined, {

    c: { ignore: { promise: true } },
    d: { ignore: { observable: true } }
});
const TextoRx = componentToRx(Texto, <span>Cargando...</span>);

const TextoRxInicial = componentToRx(Texto, undefined, undefined, {
    texto: { initial: "Valor inicial promesa/rxjs sin resolver" },
});


class LoadingComponent extends React.PureComponent<{ texto: string, loading?: boolean }> {
    render() {
        return (
            <div>
                <span>El texto es: {this.props.texto}</span>
                <br />
                <span>Actualmente esta cargando: {"" + this.props.loading}</span>
                <br />
            </div>
        );
    }
}

const LoadingComponentRx = componentToRx(LoadingComponent, undefined, undefined, {
    loading: { loading: true }
});


class PromLoadingComponent extends React.PureComponent<{ a: number, b: number, loading?: boolean }> {
    render() {
    console.log("render");
        const noConsistente = this.props.a != this.props.b && !this.props.loading;
        if(noConsistente) {
            console.log("ERROR no consistente");
        }
        return (
            <div>
                <span>a: {this.props.a}</span>
                <br />
                <span>b: {this.props.b}</span>
                <br />
                <span>cargando: {"" + this.props.loading}</span>

                <br />
                {noConsistente && <span style={{ background: "red" }} >ERROR NO CONSISTENTE</span>}

            </div>
        )
    }
}

const PromLoadingCompRx = componentToRx(PromLoadingComponent, undefined, undefined, { loading: { loading: true } });

export class App extends React.Component<{}, { prom: Promise<number>, promValue: number }> {
    private timerA = rx.Observable.timer(0, 1000);
    private timerB = rx.Observable.timer(0, 800);
    private timerC = rx.Observable.timer(0, 100);

    private timerOtro = rx.Observable.timer(0, 500);
    private cargando = rx.Observable.timer(1000).map(x => "" + x);
    private inmediato = new rx.BehaviorSubject("Hola");
    private error = new rx.Subject<string>();

    private promesa = delay(3000).then(x => "Finalizó promesa");

    constructor(props) {
        super(props);
        this.state = {
            prom: delay(300).then(x => 12),
            promValue: 12
        };

        setTimeout(() => {
            this.error.error("Este es un error");
        }, 3000);

        rx.Observable.timer(0, 2000).subscribe(x => this.setState({ prom: delay(400).then(y => x), promValue: x }));
    }
    render() {
        return (
            <div>
                <PromLoadingCompRx a={this.state.prom} b={this.state.promValue} />
                                
                {/* <MyCompRx a={this.timerA} b={this.timerB} c={33} />
                <TextoRx texto={this.cargando} />
                <TextoRx texto={this.inmediato} />
                <TextoRx texto={this.error} />
                {rxToReact(this.timerOtro.map(x => <span>Otro: {x}</span>))}

                <MyComp2Rx
                    a={this.timerA.map(x => "timer mapeado a: " + x)}
                    b={this.promesa}
                    c={this.promesa.then(x => delay(2000)).then(x => "Otra promesa")}
                    d={this.timerC.map(x => "timer otro mapeo a: " + x)}
                    e={"Cadena establecida directamente"}
                />

                <TextoRxInicial texto={this.promesa} />

                <OtraPruebaRx
                    d={this.timerC.map(x => "timer otro mapeo 2 a: " + x)}
                    e={this.timerA.map(x => "timer otro mapeo 3 a: " + x)} />

                <LoadingComponentRx texto={delay(4000).then(x => "Se terminó la promesa")} />
                <LoadingComponentRx texto={delay(4000).then(x => "Siempre cargando")} loading={true} />
                <LoadingComponentRx texto={delay(4000).then(x => "Nunca cargando")} loading={false} /> */}
            </div>
        )
    }
}

DOM.render(<App />, document.getElementById("root"));
