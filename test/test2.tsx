import { RxToReact, propsToRx, componentToRx } from "../src/index";
import * as React from "react";
import * as DOM from "react-dom";
import * as rx from "rxjs";

class MyComp extends React.PureComponent<{ x: number }> {
    render() {
        return <div>{this.props.x}</div>
    }
}

const MyCompRx = componentToRx(MyComp);

const obs = new rx.Observable<number>(subs => {
    console.log("Subscribe");
    subs.next(10);

    return () => console.log("Unsubscribe");
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
                    this.props.view && <MyCompRx x={obs} />
                }
            </div>
        );
    }
}

class Index extends React.PureComponent<{}, {x: string, view: boolean}> {
    constructor(props) {
        super(props);
        this.state = {
            x:"hola",
            view: true
        }
    }
    render() {
        return (
            <Form 
                x={this.state.x}
                view={this.state.view}
                onXChange={x => this.setState({x: x})}
                onViewChange={x => this.setState({view: x})}
            />
        )
    }
}


DOM.render(<Index />, document.getElementById("root"));


