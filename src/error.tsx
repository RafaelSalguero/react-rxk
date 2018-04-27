import * as React from "react";
export interface PropError {
    prop: string;
    error: any;
}

/**Vista por default para los errores de componentToRx */
export class ErrorView extends React.PureComponent<{ errores: PropError[] }> {
    render() {
        return (
            <span style={{ color: "red" }}>
                {
                    this.props.errores.map((x, i) =>
                        <span key={i}>
                            Error al obtener <span style={{fontWeight: "bold"}} >{x.prop}</span>: <span style={{fontStyle: "italic"}}>{"" + x.error}</span>
                        </span>
                    )
                }
            </span>
        );
    }
}