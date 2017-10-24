import { rxToReact, componentToRx } from "../src/index";
import * as React from "react";
import * as DOM from "react-dom";
import * as rx from "rxjs";

interface MyProps {
    a: number;
    b: number;
    c: number;
}
class MyComp extends React.PureComponent<MyProps> {
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

class Texto extends React.PureComponent<{ texto: string }> {
    render() {
        return (
            <div>
                <span>El texto es: {this.props.texto}</span>
                <br />
            </div>
        );
    }
}

const MyCompRx = componentToRx(MyComp);
const TextoRx = componentToRx(Texto, <span>Cargando...</span>);
export class App extends React.PureComponent {
    private timerA = rx.Observable.timer(0, 1000);
    private timerB = rx.Observable.timer(0, 800);

    private timerOtro = rx.Observable.timer(0, 500);
    private cargando = rx.Observable.timer(1000).map(x => "" + x);
    private inmediato = new rx.BehaviorSubject("Hola");
    private error = new rx.Subject<string>();
    constructor(props) {
        super(props);
        
        setTimeout(() => {
            this.error.error("Este es un error");
        }, 3000);
    }
    render() {
        return (
            <div>
                <MyCompRx a={this.timerA} b={this.timerB} c={33} />
                <TextoRx texto={this.cargando} />
                <TextoRx texto={this.inmediato} />
                <TextoRx texto={this.error} />
                {rxToReact(this.timerOtro.map(x => <span>Otro: {x}</span>))}
            </div>
        )
    }
}

DOM.render(<App />, document.getElementById("root"));
