import { RxToReact, propsToRx, componentToRx } from "../src/index";
import * as React from "react";
import * as DOM from "react-dom";
import * as rx from "rxjs";
import { contains } from "keautils";

class Test extends React.PureComponent<{
    guias: string[],
    value: string[],
    onChange: (x: string[]) => void,

}> {
    constructor(props) {
        super(props);
        console.log("Construyendo Test");
    }
    render() {
        return (
            <div>
                <ul>
                    {this.props.guias.map(x =>
                        <li>
                            <button onClick={() => {
                                if(contains( this.props.value, x) ) {
                                    this.props.onChange(this.props.value.filter(y => y != x));
                                } else {
                                    this.props.onChange([...this.props.value, x]);
                                }
                            }}>
                                X
                            </button>
                            {(contains( this.props.value, x) ? "[X] - " : "    - " ) + x}
                        </li>)}
                </ul>
            </div>
        )
    }
}
const TestRx = componentToRx(Test);
const guiasObs = new rx.Observable<string[]>((subs) => {
    console.log("Subscribe");
    subs.next([
        "A",
        "B",
        "C",
        "D"
    ])

    return () => 
        console.log("Unsubscribe");
});
class Form extends React.PureComponent<{
    x: string,
    view: boolean,
    onXChange: (x: string) => void;
    onViewChange: (value: boolean) => void;
    value: string[];
    onChange: (x: string[]) => void;
}> {
    render() {
        return (
            <div>
                <label>{this.props.x}</label>
                <input value={this.props.x} onChange={ev => this.props.onXChange(ev.currentTarget.value)} />
                <button onClick={() => this.props.onViewChange(!this.props.view)}>
                    View
                </button>


                {
                    this.props.view && <TestRx 
                        guias={guiasObs}
                        value={this.props.value}
                        onChange={this.props.onChange}
                    />
                }
            </div>
        );
    }
}

class Index extends React.PureComponent<{}, {x: string, view: boolean, value: string[]}> {
    constructor(props) {
        super(props);
        this.state = {
            x:"hola",
            view: true,
            value: []
        }
    }
    render() {
        return (
            <Form 
                x={this.state.x}
                view={this.state.view}
                onXChange={x => this.setState({x: x})}
                onViewChange={x => this.setState({view: x})}
                value={this.state.value}
                onChange={x => this.setState({value: x})}
            />
        )
    }
}


DOM.render(<Index />, document.getElementById("root"));


