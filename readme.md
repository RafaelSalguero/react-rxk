# react-rx
Higher order component to make any component accept RxJS observables and promises as props

### Create a component
```js
interface MyProps {
    time: number;
}
class MyComp extends React.PureComponent<MyProps> {
    render() {
        return (
            <div>
                <label>Time is: </label>{this.props.time}
            </div>)
    }
}
```

### Use the `componentToRx` function

```js
//MyCompRx accepts Observable values as props
const MyCompRx = componentToRx(MyComp);
```

### Use the RxJS compatible component
```js
export class App extends React.PureComponent {
    private timer = rx.Observable.timer(0, 1000);
   
    render() {
        return (
            <div>
                {/*MyCompRx accept observable props*/}
                <MyCompRx time={this.timer} />
            </div>
        )
    }
}
```

### Or use the `rxToReact` function to render a stream of components

```js
export class App extends React.PureComponent {
    private timer = rx.Observable.timer(0, 1000);
    render() {
        return (
            <div>
                {rxtoReact(timer.map(value => <span>Time is: {value}</span> ))}
            </div>
        )
    }
}
```
