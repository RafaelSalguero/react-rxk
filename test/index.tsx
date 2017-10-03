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
            </div>)
    }
}

const MyCompRx = componentToRx(MyComp);

export class App extends React.PureComponent {
    private timerA = rx.Observable.timer(0, 1000);
    private timerB = rx.Observable.timer(0, 800);

    private timerOtro = rx.Observable.timer(0, 500);

    render() {
        return (
            <div>
                <MyCompRx a={this.timerA} b={this.timerB} c={33} />

                {rxToReact(this.timerOtro.map(x => <span>Otro: {x}</span>))}
            </div>
        )
    }
}

DOM.render(<App />, document.getElementById("root"));
