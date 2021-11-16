## Slide 1

<div class="viz">
digraph {
	rankdir = LR;
	splines = ortho;
	subgraph {
		rank = same;
		A [shape = record, style = rounded, margin = 0.2, label = "Node A"];
		B [label = "Node B"];
	}
	subgraph {
		rank = same;
		C [label = "Node C"];
		D [label = "Node D"];
	}
	A -> B;
	A -> C;
	B -> D;
	C -> D;
}
</div>

-

### Slide 1.1

TODO

---

## Slide 2

TODO

-

### Slide 2.1

TODO
