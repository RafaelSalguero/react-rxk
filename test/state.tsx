import { RxToReact, PropsToRx, componentToRx } from "../src/index";
import * as React from "react";
import * as DOM from "react-dom";
import * as rx from "rxjs";


export interface Props {
    value: number;
}
export interface State {
    value: number;
}
class ComponenteConState extends React.PureComponent<Props, State> {
    constructor(props) {
        super(props);
        this.state = {
            value: 0
        };
    }

    render() {
        return (
            <div>
                <button onClick={() => this.setState({ value: this.state.value + 1 })}>
                    Aumentar state
                </button>
                <br />
                props.value: {this.props.value}
                <br />9
                state.value: {this.state.value}
            </div>
        );
    }
}

export const ComponenteConStateRx = componentToRx(ComponenteConState, <span>Cargando...</span>);