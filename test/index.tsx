import { Rx } from "../src/rx2";
import * as React from "react";
import * as DOM from "react-dom";
import * as rx from "rxjs";
import * as rxOp from "rxjs/operators";
import { RxfyScalar } from "../src";
import { syncResolve } from "keautils";

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
                    <br />
                    <label>d es observable:</label> {"" + !!(this.props.d && typeof this.props.d.subscribe == "function")}
                    <br />
                    <label>a:</label>{this.props.a}
                    <br />
                    <br />
                    <label>e:</label> {this.props.e}
                    <br />
                    <hr />
                </div>
            </div>
        )
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


const promObs1 = rx.from(delay(1000).then(x => "Promesa 1"));
const promObs2 = promObs1.pipe(rxOp.map(x => "Map: " + x));

class SimpleText extends React.PureComponent<{ text: string, loading?: boolean }> {
    componentWillMount() {
        console.log("will mount");
    }

    render() {
        return (
            <span>
                {this.props.text}
            </span>
        );
    }
}
const cargando = <span>cargando...</span>;


let contador = 0;
export class App extends React.Component<{}, { prom: RxfyScalar<string>, promValue: number, cambiar: number, promValueProm: Promise<number>, mount: boolean }> {
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
            promValueProm: delay(5000).then(x => 1),
            mount: true
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
                {
                    this.state.mount &&
                    <Rx
                        render={SimpleText}
                        loading={props => <span>cargando... {props.text}</span>}
                        props={{
                            text: this.state.prom
                        }}
                        debug
                    />
                }

                <br />
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

                <button onClick={() => this.setState({
                    prom: (async () => {
                        const cont = contador++;
                        await delay(5000 * Math.random());
                        return "" + cont;
                    })()
                })} >
                    Async random delay
                </button>

                <button onClick={() => this.setState({
                    prom: syncResolve("" + (contador++))
                })} >
                    Sync promise
                </button>

                <button onClick={() => this.setState({
                    prom: rx.timer(500, 500).pipe(rxOp.map(x => "obs value: " + x))
                })} >
                    Obs
                </button>

                <button onClick={() => this.setState({
                    prom: delay(1000).then(x => {
                        throw new Error("este es un mensaje de error");
                    })
                })} >
                    Promise error
                </button>

                <button onClick={this.onClickSync} >
                    Sync
                </button>

                <button onClick={() => this.setState({ cambiar: Math.random() })} >
                    State change
                </button>

                <button onClick={() => this.setState({ mount: !this.state.mount })} >
                    (un)mount
                </button>
            </div>
        )
    }
}

DOM.render(<App />, document.getElementById("root"));
