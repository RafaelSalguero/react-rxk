import { RxToReact, propsToRx, componentToRx } from "../src/index";
import * as React from "react";
import * as DOM from "react-dom";
import * as rx from "rxjs";
import { contains } from "keautils";

class MyComp extends React.PureComponent<{
    guias: string[],
    otroProp: {}
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
                            {x}
                        </li>)}
                </ul>
            </div>
        )
    }
}
const MyCompRx = componentToRx(MyComp);

const obs = new rx.Observable<string[]>(subs => {
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
                    this.props.view && <MyCompRx 
                        guias={obs} 
                        otroProp={{}}
                        />
                }
            </div>
        );
    }
}

class Index extends React.PureComponent<{}, { x: string, view: boolean }> {
    constructor(props) {
        super(props);
        this.state = {
            x: "hola",
            view: true
        }
    }
    render() {
        return (
            <Form
                x={this.state.x}
                view={this.state.view}
                onXChange={x => this.setState({ x: x })}
                onViewChange={x => this.setState({ view: x })}
            />
        )
    }
}


DOM.render(<Index />, document.getElementById("root"));


