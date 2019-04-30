import { RxToReact, PropsToRx, componentToRx, Rx } from "../src/index";
import * as React from "react";
import * as DOM from "react-dom";
import * as rx from "rxjs";
import * as rxOp from "rxjs/operators";
import { ComponenteConStateRx } from "./state";

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
                    <label>valor de c:</label>{this.props.c && <RxToReact value={rx.from(this.props.c.then(x => <span>{x}</span>))} />}
                    <br />
                    <label>d es observable:</label> {"" + !!(this.props.d && typeof this.props.d.subscribe == "function")}
                    <br />
                    <label>a:</label>{this.props.a}
                    <br />
                    <label>valor de d:</label>{this.props.d && <RxToReact value={this.props.d.pipe(rxOp.map(x => <span>{x}</span>))} />}
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
                {<RxToReact value={this.props.d.pipe(rxOp.map(x => <span>{x}</span>))} />}
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

const OtraPruebaRx = componentToRx<{ d: rx.Observable<string>, e: string }>(OtraPrueba, undefined, undefined, { d: { ignore: { observable: true } } });
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


class PromLoadingComponent extends React.PureComponent<{ a: number, b: number, loading?: boolean, onChange: (x: number) => void }> {
    render() {
        console.log("render");
        const noConsistente = this.props.a != this.props.b && !this.props.loading;
        if (noConsistente) {
            console.log("ERROR no consistente");
        }
        return (
            <div>
                <span>a: {this.props.a}</span>
                <br />
                <span>b: {this.props.b}</span>
                <br />
                <input value={this.props.b} onChange={ev => this.props.onChange(Number.parseInt(ev.currentTarget.value))} />
                <span>cargando: {"" + this.props.loading}</span>

                <br />
                {noConsistente && <span style={{ background: "red" }} >ERROR NO CONSISTENTE</span>}

            </div>
        )
    }
}

const PromLoadingCompRx = componentToRx(PromLoadingComponent, undefined, undefined, { loading: { loading: true } });

const promObs1 = rx.from(delay(1000).then(x => "Promesa 1"));
const promObs2 = promObs1.pipe(rxOp.map(x => "Map: " + x));

class SimpleText extends React.PureComponent<{ text: string, loading?: boolean }> {
    componentWillMount() {
        console.log("will mount");
    }

    render() {
        return (
            <div>
                <span>
                    {this.props.text}
                </span>
                <br />
            </div>
        );
    }
}
const cargando = <span>cargando...</span>;
const SimpleTextRx = componentToRx(SimpleText, <span>cargando...</span>, undefined, undefined, 1000);

class NeastedComponent extends React.PureComponent<{ text: string }> {
    render() {
        return (
            <div>
                Value: {this.props.text}
                <br />
                Neasted:
                <br />
                <SimpleTextRx text={promObs1} />
            </div>
        );
    }
}

const NeastedComponentRx = componentToRx(NeastedComponent, <span>cargando neasted...</span>, undefined, undefined);

let contador = 0;
export class App extends React.Component<{}, { prom: Promise<string> | string, promValue: number, cambiar: number, promValueProm: Promise<number> }> {
    private timerA = rx.timer(0, 1000);
    private timerB = rx.timer(0, 800);
    private timerC = rx.timer(0, 100);

    private timerOtro = rx.timer(0, 500);
    private cargando = rx.timer(1000).pipe(rxOp.map(x => "" + x));
    private inmediato = new rx.BehaviorSubject("Hola");
    private error = new rx.Subject<string>();

    private errorValorAcc = 0;
    private promesa = delay(3000).then(x => "Finalizó promesa");



    constructor(props) {
        super(props);
        this.state = {
            prom: "Hola hola",
            promValue: 12,
            cambiar: 0,
            promValueProm: delay(5000).then(x => 1)
        };

        setTimeout(() => {
            this.error.error("Este es un error");
        }, 3000);


    }

    private jInstantaneo = rx.from([<span>Hola</span>])
    private jTimer = rx.timer(0, 1000).pipe(rxOp.map(x => <span>{x}</span>));
    private jTimer2 = rx.timer(0, 1).pipe(rxOp.map(x => <span>{x}</span>));


    prom2 = delay(1000).then(x => <div>Hola a todos</div>);
    obs2 = rx.from([<div>Hola a todos</div>]);

    onClickSync = () => {
        this.setState({
            prom: "otro state sync" + contador++
        });
    }

    render() {
        return (
            <div>
                <Rx
                    render={SimpleText}
                    loading={<span>cargando...</span>}
                    options={{
                        text: {
                            initial: "Hey"
                        },
                        loading: {
                            loading: true
                        }
                    }}
                    props={{
                        text: this.state.prom
                    }}
                />

                <button onClick={() => this.setState({
                    prom: delay(1000).then(x => "otro state async" + Math.random())
                })} >
                    Async slow
                </button>

                <button onClick={() => this.setState({
                    prom: delay(200).then(x => "otro state async" + Math.random())
                })} >
                    Async fast
                </button>

                <button onClick={this.onClickSync} >
                    Sync
                </button>
            </div>
        )
    }
}

DOM.render(<App />, document.getElementById("root"));
