# react-rx
Higher order component to make any component accept RxJS observables and promises as props

### Create a component
```js
interface MyProps {
    time: number;
}
class MyComp extends React.Component<MyProps> {
    render() {
        return (
            <div>
                <label>Time is: </label>{this.props.time}
            </div>)
    }
}
```

### Use the `Rx` to pass observables as props

```js
class AnotherComp extends React.Component {
    timer = rx.timer(1000);

    render() {
        return <Rx
            render={MyComp}
            props={{
                //time property accepts number | Observable<number> | Promise<number>
                time: this.timer
            }}
        />;
    }
}
```